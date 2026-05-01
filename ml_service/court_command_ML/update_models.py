import os
import pickle

# Define paths to the teammate's models
player_models_dir = os.path.join(os.path.dirname(__file__), "..", "player_analyzer", "models")
models_to_patch = [
    os.path.join(player_models_dir, "player_level.pkl"),
    os.path.join(player_models_dir, "player_points.pkl")
]

for model_path in models_to_patch:
    try:
        with open(model_path, 'rb') as f:
            data = pickle.load(f)
        
        # Check if it's a Random Forest / Ensemble model
        model = data.get('model')
        if hasattr(model, 'estimators_'):
            for tree in model.estimators_:
                # Inject the missing attribute
                if not hasattr(tree, 'monotonic_cst'):
                    tree.monotonic_cst = None
                    
        # Re-save the model
        with open(model_path, 'wb') as f:
            pickle.dump(data, f)
            
        print(f"✅ Successfully updated and patched: {os.path.basename(model_path)}")
    except Exception as e:
        print(f"⚠️ Could not patch {os.path.basename(model_path)}: {e}")