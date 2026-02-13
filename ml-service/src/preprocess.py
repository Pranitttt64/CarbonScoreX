"""
Data preprocessing module for CarbonScoreX ML model
Loads and cleans the carbon emissions dataset
"""
import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.impute import SimpleImputer

def load_and_preprocess_data(filepath='/mnt/data/dataset pccoe.csv'):
    """
    Load and preprocess the carbon emissions dataset
    
    Args:
        filepath: Path to the CSV file
        
    Returns:
        X: Feature matrix
        y: Target variable (carbon score 0-100)
        feature_names: List of feature names
        scaler: Fitted StandardScaler for inference
    """
    # Load the dataset
    df = pd.read_csv(filepath)
    
    print(f"Dataset loaded: {df.shape[0]} rows, {df.shape[1]} columns")
    print(f"Columns: {df.columns.tolist()}")
    
    # Create a copy for processing
    df_processed = df.copy()
    
    # Handle missing values
    # Numeric columns: fill with median
    numeric_columns = df_processed.select_dtypes(include=[np.number]).columns
    numeric_imputer = SimpleImputer(strategy='median')
    df_processed[numeric_columns] = numeric_imputer.fit_transform(df_processed[numeric_columns])
    
    # Categorical columns: fill with mode
    categorical_columns = df_processed.select_dtypes(include=['object']).columns
    for col in categorical_columns:
        df_processed[col].fillna(df_processed[col].mode()[0] if len(df_processed[col].mode()) > 0 else 'Unknown', inplace=True)
    
    # Feature engineering: Create carbon score based on key environmental metrics
    # This is a synthetic target if not present in dataset
    if 'carbon_score' not in df_processed.columns:
        df_processed['carbon_score'] = create_carbon_score(df_processed)
    
    # Encode categorical variables
    label_encoders = {}
    for col in categorical_columns:
        if col != 'carbon_score':  # Don't encode target
            le = LabelEncoder()
            df_processed[col + '_encoded'] = le.fit_transform(df_processed[col])
            label_encoders[col] = le
    
    # Select features for model
    # Prioritize: emissions, energy, waste, renewable metrics
    feature_columns = [col for col in df_processed.columns 
                      if col not in ['carbon_score'] and 
                      not col.startswith('Unnamed') and
                      df_processed[col].dtype in [np.float64, np.int64]]
    
    X = df_processed[feature_columns].values
    y = df_processed['carbon_score'].values
    
    # Normalize features
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    print(f"Features selected: {len(feature_columns)}")
    print(f"Target range: {y.min():.2f} - {y.max():.2f}")
    
    return X_scaled, y, feature_columns, scaler, label_encoders

def create_carbon_score(df):
    """
    Create a normalized carbon score (0-100) based on environmental metrics
    Higher score = better environmental performance
    
    Logic:
    - High renewable energy % -> higher score
    - High recycling % -> higher score
    - Low emissions -> higher score
    - Low energy consumption -> higher score
    """
    score = 50  # Base score
    
    # Check for common column patterns
    for col in df.columns:
        col_lower = col.lower()
        
        # Renewable energy (positive factor)
        if 'renewable' in col_lower or 'clean_energy' in col_lower:
            score += (df[col] / df[col].max() * 20).fillna(0)
        
        # Recycling (positive factor)
        if 'recycl' in col_lower or 'waste' in col_lower and 'reduction' in col_lower:
            score += (df[col] / df[col].max() * 15).fillna(0)
        
        # Emissions (negative factor)
        if 'emission' in col_lower or 'co2' in col_lower:
            score -= (df[col] / df[col].max() * 25).fillna(0)
        
        # Energy consumption (negative factor if high)
        if 'energy_consumption' in col_lower or 'power_usage' in col_lower:
            score -= (df[col] / df[col].max() * 15).fillna(0)
    
    # Normalize to 0-100 range
    score = np.clip(score, 0, 100)
    
    return score

def extract_features_from_json(data_dict):
    """
    Extract and format features from JSON input for prediction
    
    Args:
        data_dict: Dictionary with company data
        
    Returns:
        Feature array ready for model input
    """
    # Expected features (customize based on your actual dataset)
    expected_features = [
        'energy_consumption',
        'renewable_energy_pct',
        'waste_recycled_pct',
        'emissions_co2',
        'water_usage',
        'employee_count',
        'production_volume'
    ]
    
    features = []
    for feat in expected_features:
        features.append(data_dict.get(feat, 0))
    
    return np.array(features).reshape(1, -1)