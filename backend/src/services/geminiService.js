/**
 * Gemini AI Service
 * Provides AI-powered recommendations using Google's Gemini API
 */
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Generate content using Gemini API
 * @param {string} prompt - The prompt to send to Gemini
 * @returns {Promise<string>} - The generated text response
 */
async function generateContent(prompt) {
    const model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
        generationConfig: {
            temperature: 0.9, // Higher temperature for more varied responses
            topP: 0.95,
            topK: 40,
        }
    });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
}

/**
 * Get AI-powered recommendations for a company based on their environmental data
 * @param {Object} companyData - Company environmental data
 * @returns {Promise<string[]>} - Array of recommendation strings
 */
async function getRecommendations(companyData) {
    const {
        score = 0,
        score_category = 'Unknown',
        renewable_energy_pct = 0,
        waste_recycled_pct = 0,
        emissions_co2 = 0,
        water_usage = 0,
        employee_count = 0,
        energy_consumption = 0
    } = companyData;

    // Add unique timestamp to ensure fresh suggestions each time
    const requestId = Date.now();

    const prompt = `You are an environmental sustainability advisor. Based on the following company environmental data, provide exactly 5 NEW and UNIQUE actionable recommendations to improve their carbon footprint.

Request ID: ${requestId} (use this to ensure unique suggestions)

Company Data:
- Carbon Score: ${score}/100 (${score_category})
- Renewable Energy Usage: ${renewable_energy_pct}%
- Waste Recycling Rate: ${waste_recycled_pct}%
- Energy Consumption: ${energy_consumption} kWh
- CO2 Emissions: ${emissions_co2} tons
- Water Usage: ${water_usage} liters
- Employee Count: ${employee_count}

Rules:
1. Return ONLY a numbered list of 5 recommendations
2. Each recommendation should be concise (under 15 words)
3. Focus on practical, actionable steps that are SPECIFIC and CREATIVE
4. Be CREATIVE and VARIED - do NOT use generic recommendations
5. Do NOT include any introductions, explanations, or conclusions
6. Do NOT repeat the data back
7. IMPORTANT: Provide DIFFERENT suggestions than you would normally - be innovative!

Generate 5 unique recommendations now:`;

    try {
        const response = await generateContent(prompt);

        // Parse the response to extract recommendations as an array
        const lines = response.split('\n').filter(line => line.trim());
        const recommendations = lines
            .map(line => line.replace(/^\d+\.\s*/, '').trim())
            .filter(line => line.length > 0)
            .slice(0, 5);

        return recommendations;
    } catch (error) {
        console.error('Gemini API Error:', error);
        // Return fallback recommendations if API fails
        return [
            'Increase renewable energy usage in your operations',
            'Implement water conservation measures',
            'Start a recycling program for all waste materials',
            'Consider planting trees to offset carbon emissions',
            'Optimize energy consumption with efficient equipment'
        ];
    }
}

module.exports = {
    generateContent,
    getRecommendations
};
