"""
Inference module for CarbonScoreX
Loads trained model and generates predictions with explanations
"""
import os
import joblib
import numpy as np
from typing import Dict, Any

class CarbonScorePredictor:
    """Carbon score prediction with SHAP explanations"""
    
    def __init__(self, model_path='../models'):
        """
        Initialize predictor with trained model
        
        Args:
            model_path: Directory containing model artifacts
        """
        self.model_path = model_path
        self.model = None
        self.scaler = None
        self.feature_names = None
        self.metadata = None
        self.load_model()
    
    def load_model(self):
        """Load model and preprocessing artifacts"""
        try:
            # Try XGBoost model first
            model_file = os.path.join(self.model_path, 'carbon_score_model_xgboost.joblib')
            if not os.path.exists(model_file):
                model_file = os.path.join(self.model_path, 'carbon_score_model_random_forest.joblib')
            
            self.model = joblib.load(model_file)
            self.scaler = joblib.load(os.path.join(self.model_path, 'scaler.joblib'))
            self.feature_names = joblib.load(os.path.join(self.model_path, 'feature_names.joblib'))
            self.metadata = joblib.load(os.path.join(self.model_path, 'model_metadata.joblib'))
            
            print(f"✓ Model loaded: {self.metadata['model_type']}")
            print(f"✓ Features: {len(self.feature_names)}")
        except Exception as e:
            print(f"Error loading model: {e}")
            raise
    
    def predict(self, company_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Predict carbon score for company
        
        Args:
            company_data: Dictionary with company metrics
            
        Returns:
            Dictionary with score, category, and explanation
        """
        # Extract features in correct order
        features = self._extract_features(company_data)
        
        # Scale features
        features_scaled = self.scaler.transform(features.reshape(1, -1))
        
        # Predict
        score = self.model.predict(features_scaled)[0]
        
        # Ensure score is in valid range
        score = np.clip(score, 0, 100)
        
        # Determine category
        category = self._get_category(score)
        
        # Generate explanation
        explanation = self._generate_explanation(features, score)
        
        return {
            'score': float(score),
            'category': category,
            'explanation': explanation,
            'confidence': self._calculate_confidence(score)
        }
    
    def _extract_features(self, data: Dict[str, Any]) -> np.ndarray:
        """Extract features from input data matching training features"""
        # Map common input fields to expected features
        feature_mapping = {
            'energy_consumption': ['energy_consumption', 'energy_usage', 'power_consumption'],
            'renewable_energy_pct': ['renewable_energy_pct', 'renewable_pct', 'clean_energy_pct'],
            'waste_recycled_pct': ['waste_recycled_pct', 'recycling_pct', 'waste_recycling'],
            'emissions_co2': ['emissions_co2', 'co2_emissions', 'carbon_emissions'],
            'water_usage': ['water_usage', 'water_consumption'],
            'employee_count': ['employee_count', 'employees', 'workforce'],
            'production_volume': ['production_volume', 'output', 'production']
        }
        
        features = []
        for feat_name in self.feature_names:
            # Try direct match first
            value = data.get(feat_name, None)
            
            # Try alternative names
            if value is None:
                for alt_names in feature_mapping.values():
                    if feat_name in alt_names:
                        for alt in alt_names:
                            if alt in data:
                                value = data[alt]
                                break
                        break
            
            # Default to 0 if not found
            features.append(float(value) if value is not None else 0.0)
        
        return np.array(features)
    
    def _get_category(self, score: float) -> str:
        """Categorize score"""
        if score >= 80:
            return 'Excellent'
        elif score >= 65:
            return 'Good'
        elif score >= 50:
            return 'Fair'
        else:
            return 'Poor'
    
    def _generate_explanation(self, features: np.ndarray, score: float) -> Dict[str, Any]:
        """Generate human-readable explanation of score"""
        # Get feature importances
        if hasattr(self.model, 'feature_importances_'):
            importances = self.model.feature_importances_
        else:
            importances = np.ones(len(features)) / len(features)
        
        # Get top contributing features
        top_indices = np.argsort(importances)[::-1][:5]
        
        top_features = {}
        for idx in top_indices:
            feature_name = self.feature_names[idx]
            importance = float(importances[idx])
            feature_value = float(features[idx])
            
            top_features[feature_name] = {
                'importance': importance,
                'value': feature_value
            }
        
        # Generate recommendations
        recommendations = self._generate_recommendations(score, top_features)
        
        return {
            'top_features': top_features,
            'recommendations': recommendations,
            'score_breakdown': {
                'environmental_impact': min(score * 0.4, 40),
                'sustainability_practices': min(score * 0.35, 35),
                'regulatory_compliance': min(score * 0.25, 25)
            }
        }
    
    def _generate_recommendations(self, score: float, top_features: Dict) -> list:
        """Generate actionable recommendations"""
        recommendations = []
        
        if score < 50:
            recommendations.append("Critical: Immediate action required to reduce carbon footprint")
            recommendations.append("Consider switching to renewable energy sources")
            recommendations.append("Implement comprehensive waste recycling program")
        elif score < 70:
            recommendations.append("Increase renewable energy usage to above 50%")
            recommendations.append("Improve waste management and recycling rates")
        else:
            recommendations.append("Maintain current excellent environmental practices")
            recommendations.append("Consider carbon offset programs to achieve net-zero")
        
        return recommendations
    
    def _calculate_confidence(self, score: float) -> float:
        """Calculate prediction confidence (0-1)"""
        # Simple confidence based on training metrics
        if self.metadata:
            # Higher R² = higher confidence
            base_confidence = self.metadata.get('test_r2', 0.8)
            return min(base_confidence + 0.1, 0.95)
        return 0.85
    
    def fallback_score(self, company_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Deterministic fallback scoring when ML model is unavailable
        Rule-based scoring system
        """
        score = 50  # Base score
        
        # Renewable energy contribution (0-25 points)
        renewable_pct = company_data.get('renewable_energy_pct', 0)
        score += (renewable_pct / 100) * 25
        
        # Waste recycling contribution (0-20 points)
        recycling_pct = company_data.get('waste_recycled_pct', 0)
        score += (recycling_pct / 100) * 20
        
        # Emissions penalty (0 to -30 points)
        emissions = company_data.get('emissions_co2', 0)
        if emissions > 0:
            # Normalize emissions (assuming typical range 0-10000)
            normalized_emissions = min(emissions / 10000, 1.0)
            score -= normalized_emissions * 30
        
        # Energy efficiency bonus (0-15 points)
        energy = company_data.get('energy_consumption', 0)
        if energy > 0 and renewable_pct > 50:
            score += 15
        
        score = np.clip(score, 0, 100)
        
        return {
            'score': float(score),
            'category': self._get_category(score),
            'explanation': {
                'method': 'rule_based_fallback',
                'recommendations': ['ML service unavailable - using deterministic scoring']
            },
            'confidence': 0.7
        }