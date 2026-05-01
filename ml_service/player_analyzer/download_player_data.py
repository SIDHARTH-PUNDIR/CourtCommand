from nba_api.stats.endpoints import playergamelogs
import pandas as pd
import os

os.makedirs("data", exist_ok=True)

print("Downloading player data...")

logs = playergamelogs.PlayerGameLogs(season_nullable='2022-23')

df = logs.get_data_frames()[0]

# Keep only required columns
df = df[[
    "PTS", "AST", "REB",
    "FG_PCT", "MIN"
]]

df.to_csv("data/player_games.csv", index=False)

print("Saved → data/player_games.csv")
print(f"Rows: {len(df)}")