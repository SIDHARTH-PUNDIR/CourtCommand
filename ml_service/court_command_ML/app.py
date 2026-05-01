from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
import pickle
import os

app = Flask(__name__)
CORS(app)

# LOAD MODEL
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# LOAD MATCHUP PREDICTOR MODEL
with open(os.path.join(BASE_DIR, "models", "win_predictor.pkl"), "rb") as f:
    model_data = pickle.load(f)

model = model_data["model"]
scaler = model_data["scaler"]

# LOAD PLAYER SCOUTING MODELS
try:
    player_models_dir = os.path.join(BASE_DIR, "..", "player_analyzer", "models")
    with open(os.path.join(player_models_dir, "player_level.pkl"), "rb") as f:
        level_data = pickle.load(f)
    with open(os.path.join(player_models_dir, "player_points.pkl"), "rb") as f:
        points_data = pickle.load(f)
except Exception as e:
    print(f"Warning: Player scouting models could not be loaded: {e}")
    level_data = None
    points_data = None

# PREDICTION ROUTE
@app.route('/api/analyze-player', methods=['POST'])
def analyze_player():
    data = request.json
    try:
        pts = float(data.get("PTS", 0))
        ast = float(data.get("AST", 0))
        reb = float(data.get("REB", 0))
        fg  = float(data.get("FG_PCT", 0))
        mins = float(data.get("MIN", 24))
        
        feat_class = np.array([[pts, ast, reb, fg, mins]])
        feat_reg = np.array([[ast, reb, fg, mins]])
    except Exception:
        return jsonify({"error": "Invalid numerical input"}), 400

    # 1. AI Level Classification
    if level_data:
        X_scaled = level_data["scaler"].transform(feat_class)
        idx = level_data["model"].predict(X_scaled)
        level = level_data["encoder"].inverse_transform(idx)[0]
    else:
        level = "Unknown"

    # 2. AI Points Projection
    if points_data:
        X_reg_scaled = points_data["scaler"].transform(feat_reg)
        proj_pts = points_data["model"].predict(X_reg_scaled)[0]
    else:
        proj_pts = 0

    # Logic for Strengths and Weaknesses
    stats_map = {"Scoring": pts, "Playmaking": ast, "Rebounding": reb}
    strength = max(stats_map, key=stats_map.get)
    
    # Simple logic for weakness/tips based on your FG% and PTS
    if fg < 0.40:
        weakness = "Shooting Efficiency"
        suggestion = "Work on shot selection and mid-range consistency."
    elif pts < 10 and ast < 3:
        weakness = "Offensive Impact"
        suggestion = "Focus on aggressive driving and finding open teammates."
    else:
        weakness = "None Significant"
        suggestion = "Continue current training regimen to maintain high-tier output."

    return jsonify({
        "level": f"{level.upper()} TIER" if level != "Unknown" else level,
        "projected": round(proj_pts, 1),
        "strength": strength,
        "weakness": weakness,
        "suggestion": suggestion
    })

@app.route('/predict', methods=['POST'])
def predict():
    try:
        data = request.json

        home = np.array(data['home'])
        away = np.array(data['away'])
        recent_stats = data['recent_stats']

        # Model logic (difference)
        diff = home - away
        diff_scaled = scaler.transform([diff])
        prob = model.predict_proba(diff_scaled)[0][1]

        home_prob = round(prob * 100, 1)
        away_prob = round((1 - prob) * 100, 1)

        # DRILL LOGIC
        drills = []

        if recent_stats[0] < 0.45:
            drills.append("Low shooting efficiency → Shot selection + contested shooting drills")

        if recent_stats[1] < 0.75:
            drills.append("Poor FT → 100 pressure free throws daily")

        if recent_stats[2] < 0.35:
            drills.append("Weak 3PT → Corner 3 repetition drills")

        if recent_stats[3] < 24:
            drills.append("Low assists → Ball movement drills (3-pass rule)")

        if recent_stats[4] < 42:
            drills.append("Weak rebounding → Box-out drills")

        return jsonify({
            "home_prob": home_prob,
            "away_prob": away_prob,
            "drills": drills
        })

    except Exception as e:
        return jsonify({"error": str(e)})

if __name__ == '__main__':
    app.run(debug=True)