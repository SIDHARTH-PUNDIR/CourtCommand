import os
import pickle
import numpy as np
from flask import Flask, render_template, request, jsonify

base_dir = os.path.abspath(os.path.dirname(__file__))
app = Flask(__name__, template_folder=base_dir, static_folder=base_dir, static_url_path='')

def load_ai_model(filename):
    path = os.path.join(base_dir, "models", filename)
    if os.path.exists(path):
        with open(path, "rb") as f:
            return pickle.load(f)
    return None

level_data = load_ai_model("player_level.pkl")
points_data = load_ai_model("player_points.pkl")

@app.route("/")
def home():
    return render_template("player.html")

@app.route("/analyze", methods=["POST"])
def analyze():
    data = request.json
    try:
        pts = float(data.get("PTS", 0))
        ast = float(data.get("AST", 0))
        reb = float(data.get("REB", 0))
        fg  = float(data.get("FG_PCT", 0))
        mins = float(data.get("MIN", 0))
        
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
        "level": f"{level.upper()} TIER",
        "projected": round(proj_pts, 1),
        "strength": strength,
        "weakness": weakness,
        "suggestion": suggestion
    })

if __name__ == "__main__":
    app.run(debug=True)