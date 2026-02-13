/**
 * ML Service Integration
 * Calls Python FastAPI microservice for carbon score predictions
 */
const axios = require('axios');

class MLService {
  constructor() {
    this.mlServiceUrl = process.env.ML_SERVICE_URL || 'http://localhost:8000';
    this.timeout = 30000; // 30 seconds
  }

  /**
   * Check if ML service is available
   */
  async healthCheck() {
    try {
      const response = await axios.get(`${this.mlServiceUrl}/health`, {
        timeout: 5000
      });
      return response.data;
    } catch (error) {
      console.error('ML service health check failed:', error.message);
      return { status: 'unhealthy', model_loaded: false };
    }
  }

  /**
   * Get carbon score prediction from ML service
   */
  async predictScore(companyData) {
    try {
      console.log('Calling ML service for prediction...');
      
      const response = await axios.post(
        `${this.mlServiceUrl}/predict`,
        companyData,
        {
          timeout: this.timeout,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('✓ ML prediction received:', response.data);
      return {
        success: true,
        data: response.data
      };

    } catch (error) {
      console.error('ML service prediction error:', error.message);
      
      // Fallback to rule-based scoring if ML service fails
      console.log('Using fallback rule-based scoring...');
      return {
        success: false,
        data: this.fallbackScore(companyData),
        error: error.message
      };
    }
  }

  /**
   * Batch prediction for multiple companies
   */
  async batchPredict(companiesData) {
    try {
      const response = await axios.post(
        `${this.mlServiceUrl}/batch-predict`,
        companiesData,
        {
          timeout: this.timeout * 2,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: true,
        data: response.data
      };

    } catch (error) {
      console.error('ML batch prediction error:', error.message);
      
      // Fallback for each company
      const predictions = companiesData.map(data => this.fallbackScore(data));
      return {
        success: false,
        data: { predictions, count: predictions.length },
        error: error.message
      };
    }
  }

  /**
   * Get model information
   */
  async getModelInfo() {
    try {
      const response = await axios.get(`${this.mlServiceUrl}/model-info`, {
        timeout: 5000
      });
      return response.data;
    } catch (error) {
      console.error('Failed to get model info:', error.message);
      return { model_type: 'unavailable' };
    }
  }

  /**
   * Deterministic fallback scoring when ML service is unavailable
   * Rule-based carbon score calculation (0-100)
   */
  fallbackScore(companyData) {
    let score = 50; // Base score

    // Renewable energy contribution (0-25 points)
    const renewablePct = companyData.renewable_energy_pct || 0;
    score += (renewablePct / 100) * 25;

    // Waste recycling contribution (0-20 points)
    const recyclingPct = companyData.waste_recycled_pct || 0;
    score += (recyclingPct / 100) * 20;

    // Emissions penalty (0 to -30 points)
    const emissions = companyData.emissions_co2 || 0;
    if (emissions > 0) {
      const normalizedEmissions = Math.min(emissions / 10000, 1.0);
      score -= normalizedEmissions * 30;
    }

    // Energy efficiency bonus (0-15 points)
    const energy = companyData.energy_consumption || 0;
    if (energy > 0 && renewablePct > 50) {
      score += 15;
    }

    // Water conservation bonus (0-10 points)
    const water = companyData.water_usage || 0;
    if (water > 0 && water < 5000) {
      score += 10;
    }

    // Clamp score to 0-100
    score = Math.max(0, Math.min(100, score));

    // Determine category
    let category;
    if (score >= 80) category = 'Excellent';
    else if (score >= 65) category = 'Good';
    else if (score >= 50) category = 'Fair';
    else category = 'Poor';

    // Generate recommendations
    const recommendations = [];
    if (renewablePct < 50) {
      recommendations.push('Increase renewable energy usage above 50%');
    }
    if (recyclingPct < 60) {
      recommendations.push('Improve waste recycling rate to at least 60%');
    }
    if (emissions > 5000) {
      recommendations.push('Implement emission reduction strategies');
    }
    if (score < 70) {
      recommendations.push('Consider carbon offset programs');
    }

    return {
      score: parseFloat(score.toFixed(2)),
      category,
      explanation: {
        method: 'rule_based_fallback',
        top_features: {
          renewable_energy_pct: { value: renewablePct, impact: 'positive' },
          waste_recycled_pct: { value: recyclingPct, impact: 'positive' },
          emissions_co2: { value: emissions, impact: 'negative' }
        },
        recommendations
      },
      confidence: 0.70,
      model_version: 'fallback_v1'
    };
  }

  /**
   * Calculate subsidy or tariff based on score
   */
  calculateIncentive(score) {
    if (score >= 80) {
      // Excellent: High subsidy
      return {
        type: 'subsidy',
        amount: 10000,
        description: 'Excellence Award for outstanding environmental performance'
      };
    } else if (score >= 65) {
      // Good: Medium subsidy
      return {
        type: 'subsidy',
        amount: 5000,
        description: 'Good Performance Subsidy'
      };
    } else if (score >= 50) {
      // Fair: Small subsidy
      return {
        type: 'subsidy',
        amount: 2000,
        description: 'Standard Compliance Subsidy'
      };
    } else {
      // Poor: Tariff
      const tariffAmount = Math.round((50 - score) * 100);
      return {
        type: 'tariff',
        amount: tariffAmount,
        description: 'Carbon Tariff for substandard environmental performance'
      };
    }
  }
}

module.exports = new MLService();