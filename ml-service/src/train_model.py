"""
Model training script for CarbonScoreX
Trains XGBoost model to predict carbon scores (0-100)
"""
import os
import joblib
import numpy as np
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.ensemble import RandomForestRegressor
from xgboost import XGBRegressor
from sklearn.metrics import mean_absolute_error, r2_score, mean_squared_error
import matplotlib.pyplot as plt
from preprocess import load_and_preprocess_data

def train_model(model_type='xgboost', save_path='../models'):
    """
    Train carbon scoring model
    
    Args:
        model_type: 'xgboost' or 'random_forest'
        save_path: Directory to save trained model
        
    Returns:
        Trained model, evaluation metrics
    """
    print("=" * 60)
    print("CarbonScoreX Model Training")
    print("=" * 60)
    
    # Load and preprocess data
    print("\n1. Loading data from /mnt/data/dataset pccoe.csv...")
    X, y, feature_names, scaler, label_encoders = load_and_preprocess_data(
        filepath='/mnt/data/dataset pccoe.csv'
    )
    
    # Split data
    print("\n2. Splitting data (80% train, 20% test)...")
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )
    
    print(f"   Training set: {X_train.shape[0]} samples")
    print(f"   Test set: {X_test.shape[0]} samples")
    
    # Initialize model
    print(f"\n3. Training {model_type} model...")
    
    if model_type == 'xgboost':
        model = XGBRegressor(
            n_estimators=200,
            max_depth=6,
            learning_rate=0.1,
            subsample=0.8,
            colsample_bytree=0.8,
            random_state=42,
            objective='reg:squarederror'
        )
    else:  # random_forest
        model = RandomForestRegressor(
            n_estimators=200,
            max_depth=10,
            min_samples_split=5,
            min_samples_leaf=2,
            random_state=42,
            n_jobs=-1
        )
    
    # Train model
    model.fit(X_train, y_train)
    print("   ✓ Model training complete")
    
    # Evaluate model
    print("\n4. Evaluating model performance...")
    
    # Training set predictions
    y_train_pred = model.predict(X_train)
    train_mae = mean_absolute_error(y_train, y_train_pred)
    train_r2 = r2_score(y_train, y_train_pred)
    
    # Test set predictions
    y_test_pred = model.predict(X_test)
    test_mae = mean_absolute_error(y_test, y_test_pred)
    test_rmse = np.sqrt(mean_squared_error(y_test, y_test_pred))
    test_r2 = r2_score(y_test, y_test_pred)
    
    print(f"\n   Training Metrics:")
    print(f"   - MAE: {train_mae:.2f}")
    print(f"   - R²: {train_r2:.4f}")
    
    print(f"\n   Test Metrics:")
    print(f"   - MAE: {test_mae:.2f}")
    print(f"   - RMSE: {test_rmse:.2f}")
    print(f"   - R²: {test_r2:.4f}")
    
    # Cross-validation
    print("\n5. Performing 5-fold cross-validation...")
    cv_scores = cross_val_score(model, X, y, cv=5, 
                                scoring='neg_mean_absolute_error')
    cv_mae = -cv_scores.mean()
    cv_std = cv_scores.std()
    print(f"   Cross-validation MAE: {cv_mae:.2f} (+/- {cv_std:.2f})")
    
    # Feature importance
    print("\n6. Feature importance analysis...")
    if hasattr(model, 'feature_importances_'):
        importances = model.feature_importances_
        indices = np.argsort(importances)[::-1]
        
        print("\n   Top 10 Most Important Features:")
        for i in range(min(10, len(feature_names))):
            idx = indices[i]
            print(f"   {i+1}. {feature_names[idx]}: {importances[idx]:.4f}")
    
    # Save model artifacts
    print(f"\n7. Saving model artifacts to {save_path}...")
    os.makedirs(save_path, exist_ok=True)
    
    # Save model
    model_filename = os.path.join(save_path, f'carbon_score_model_{model_type}.joblib')
    joblib.dump(model, model_filename)
    print(f"   ✓ Model saved: {model_filename}")
    
    # Save scaler
    scaler_filename = os.path.join(save_path, 'scaler.joblib')
    joblib.dump(scaler, scaler_filename)
    print(f"   ✓ Scaler saved: {scaler_filename}")
    
    # Save feature names
    features_filename = os.path.join(save_path, 'feature_names.joblib')
    joblib.dump(feature_names, features_filename)
    print(f"   ✓ Feature names saved: {features_filename}")
    
    # Save metadata
    metadata = {
        'model_type': model_type,
        'test_mae': test_mae,
        'test_rmse': test_rmse,
        'test_r2': test_r2,
        'cv_mae': cv_mae,
        'n_features': len(feature_names),
        'feature_names': feature_names
    }
    metadata_filename = os.path.join(save_path, 'model_metadata.joblib')
    joblib.dump(metadata, metadata_filename)
    print(f"   ✓ Metadata saved: {metadata_filename}")
    
    print("\n" + "=" * 60)
    print("Training Complete!")
    print("=" * 60)
    
    return model, {
        'test_mae': test_mae,
        'test_r2': test_r2,
        'feature_importances': dict(zip(feature_names, importances)) if hasattr(model, 'feature_importances_') else {}
    }

if __name__ == '__main__':
    # Train model
    model, metrics = train_model(model_type='xgboost')
    
    print(f"\nModel ready for deployment!")
    print(f"Expected MAE on new data: ~{metrics['test_mae']:.2f} points")