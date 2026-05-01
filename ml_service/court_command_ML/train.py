import pandas as pd
import numpy as np
import pickle, json, os, warnings
warnings.filterwarnings("ignore")

from sklearn.model_selection import train_test_split, GridSearchCV
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans
from sklearn.metrics import accuracy_score, confusion_matrix, mean_absolute_error, r2_score, roc_auc_score

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import seaborn as sns

# ── Ensure folders ─────────────────────────────────────────────
os.makedirs("models", exist_ok=True)
os.makedirs("plots", exist_ok=True)

# ── Features ───────────────────────────────────────────────────
CORE_STATS = ["FG_PCT", "FT_PCT", "FG3_PCT", "AST", "REB"]
HOME_FEATS = [f"{s}_home" for s in CORE_STATS]
AWAY_FEATS = [f"{s}_away" for s in CORE_STATS]
DIFF_FEATS = [f"{s}_diff" for s in CORE_STATS]
FEAT_NAMES = ["FG%", "FT%", "3PT%", "AST", "REB"]

# ═══════════════════════════════════════════════════════════════
# STEP 1 – LOAD DATA
# ═══════════════════════════════════════════════════════════════
def load_and_engineer(path="data/games.csv"):
    if not os.path.exists(path):
        raise FileNotFoundError(f"ERROR: '{path}' not found")

    df = pd.read_csv(path)

    print("\nSTEP 1 · Dataset loaded")
    print("Rows:", len(df))

    # Feature engineering
    for s in CORE_STATS:
        df[f"{s}_diff"] = df[f"{s}_home"] - df[f"{s}_away"]

    df.dropna(inplace=True)

    print("After cleaning:", len(df))
    return df

# ═══════════════════════════════════════════════════════════════
# STEP 2 – WIN PREDICTOR (TUNED)
# ═══════════════════════════════════════════════════════════════
def train_win_predictor(df):
    print("\nSTEP 2 · Win Predictor (TUNED)")

    X = df[DIFF_FEATS].values
    y = df["HOME_TEAM_WINS"].values

    X_tr, X_te, y_tr, y_te = train_test_split(
        X, y, test_size=0.2, stratify=y, random_state=42
    )

    scaler = StandardScaler()
    X_tr = scaler.fit_transform(X_tr)
    X_te = scaler.transform(X_te)

    # Model
    rf = RandomForestClassifier(random_state=42)

    # 🔥 Hyperparameter tuning
    param_grid = {
        "n_estimators": [100, 200],
        "max_depth": [5, 10, None],
        "min_samples_split": [2, 5],
        "min_samples_leaf": [1, 2]
    }

    grid = GridSearchCV(
        rf,
        param_grid,
        cv=5,
        scoring="accuracy",
        n_jobs=1,
        verbose=1
    )

    grid.fit(X_tr, y_tr)

    best_model = grid.best_estimator_
    print("Best Params:", grid.best_params_)

    # Evaluation
    y_pred = best_model.predict(X_te)
    acc = accuracy_score(y_te, y_pred)

    y_prob = best_model.predict_proba(X_te)[:, 1]
    auc = roc_auc_score(y_te, y_prob)
    cm = confusion_matrix(y_te, y_pred)

    print("Accuracy:", round(acc * 100, 2), "%")

    payload = {
        "model": best_model,
        "scaler": scaler,
        "test_acc": acc,
        "auc": auc,
        "cm": cm.tolist()
    }

    with open("models/win_predictor.pkl", "wb") as f:
        pickle.dump(payload, f)

    return payload

# ═══════════════════════════════════════════════════════════════
# STEP 3 – SCORE PREDICTOR
# ═══════════════════════════════════════════════════════════════
def train_score_predictor(df):
    print("\nSTEP 3 · Score Predictor")

    X = df[HOME_FEATS].values
    y = df["PTS_home"].values

    X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, random_state=42)

    scaler = StandardScaler()
    X_tr = scaler.fit_transform(X_tr)
    X_te = scaler.transform(X_te)

    model = RandomForestRegressor(n_estimators=200, max_depth=12, random_state=42)
    model.fit(X_tr, y_tr)

    y_pred = model.predict(X_te)

    mae = mean_absolute_error(y_te, y_pred)
    r2 = r2_score(y_te, y_pred)

    print("MAE:", round(mae, 2))
    print("R2:", round(r2, 2))

    payload = {
        "model": model,
        "scaler": scaler,
        "mae": mae,
        "r2": r2
    }

    with open("models/score_predictor.pkl", "wb") as f:
        pickle.dump(payload, f)

    return payload

# ═══════════════════════════════════════════════════════════════
# STEP 4 – CLUSTERING
# ═══════════════════════════════════════════════════════════════
def train_clusterer(df):
    print("\nSTEP 4 · Clustering")

    X = df[HOME_FEATS].values

    scaler = StandardScaler()
    X = scaler.fit_transform(X)

    km = KMeans(n_clusters=5, random_state=42, n_init=10)
    km.fit(X)

    with open("models/clusterer.pkl", "wb") as f:
        pickle.dump({"model": km, "scaler": scaler}, f)

# ═══════════════════════════════════════════════════════════════
# STEP 5 – SIMPLE PLOT
# ═══════════════════════════════════════════════════════════════
def save_plot():
    plt.figure()
    plt.plot([1,2,3], [1,4,9])
    plt.title("Dummy Plot")
    plt.savefig("plots/dashboard.png")
    plt.close()

# ═══════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════
if __name__ == "__main__":
    try:
        df = load_and_engineer("data/games.csv")

        wp = train_win_predictor(df)
        sp = train_score_predictor(df)
        train_clusterer(df)

        save_plot()

        print("\nTRAINING COMPLETE")
        print("Models saved in /models")
        print("Plot saved in /plots")

    except Exception as e:
        print("ERROR:", e)