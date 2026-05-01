
import pandas as pd
import numpy as np
import pickle
import os

from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.metrics import accuracy_score, mean_absolute_error, r2_score

os.makedirs("models", exist_ok=True)
# FEATURES (Reduced)

FEATURES = ["PTS", "AST", "REB", "FG_PCT", "MIN"]

def load_data(path="data/player_games.csv"):
    if os.path.exists(path):
        df = pd.read_csv(path)
        print("Loaded real dataset")
    else:
        print("Generating synthetic data...")
        np.random.seed(42)
        n = 2000

        df = pd.DataFrame({
            "PTS": np.random.normal(15, 6, n),
            "AST": np.random.normal(4, 2, n),
            "REB": np.random.normal(5, 3, n),
            "FG_PCT": np.random.uniform(0.35, 0.6, n),
            "MIN": np.random.normal(25, 8, n),
        })

    df = df.clip(lower=0)
    # PERFORMANCE LEVEL (Label)
    conditions = [
        df["PTS"] >= 18,
        df["PTS"] >= 10
    ]
    choices = ["Star", "Average"]

    df["LEVEL"] = np.select(conditions, choices, default="Below Average")

    return df

# CLASSIFICATION MODEL
def train_classifier(df):
    print("\nTraining Performance Level Model...")

    X = df[FEATURES]
    y = df["LEVEL"]

    le = LabelEncoder()
    y = le.fit_transform(y)

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    X_train, X_test, y_train, y_test = train_test_split(
        X_scaled, y, test_size=0.2, random_state=42
    )

    model = RandomForestClassifier(n_estimators=150)
    model.fit(X_train, y_train)

    acc = accuracy_score(y_test, model.predict(X_test))
    print(f"Accuracy: {round(acc*100,2)}%")

    with open("models/player_level.pkl", "wb") as f:
        pickle.dump({
            "model": model,
            "scaler": scaler,
            "encoder": le
        }, f)

# REGRESSION MODEL

def train_regressor(df):
    print("\nTraining Points Predictor...")

    X = df[["AST", "REB", "FG_PCT", "MIN"]]
    y = df["PTS"]

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    X_train, X_test, y_train, y_test = train_test_split(
        X_scaled, y, test_size=0.2, random_state=42
    )

    model = RandomForestRegressor(n_estimators=150)
    model.fit(X_train, y_train)

    preds = model.predict(X_test)

    mae = mean_absolute_error(y_test, preds)
    r2 = r2_score(y_test, preds)

    print(f"MAE: {round(mae,2)}")
    print(f"R2: {round(r2,2)}")

    with open("models/player_points.pkl", "wb") as f:
        pickle.dump({
            "model": model,
            "scaler": scaler
        }, f)


if __name__ == "__main__":
    df = load_data()

    train_classifier(df)
    train_regressor(df)

    print("\nTRAINING COMPLETE")