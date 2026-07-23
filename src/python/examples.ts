// Ready-to-run programs for the "Real Python" mode. These use genuine
// libraries (numpy, pandas, scikit-learn, matplotlib) that Pyodide provides.

export interface PyExample {
  id: string
  title: string
  emoji: string
  tag: string
  code: string
}

export const PY_EXAMPLES: PyExample[] = [
  {
    id: 'basics',
    title: 'Python Basics',
    emoji: '🐍',
    tag: 'No libraries',
    code: `# Plain Python — a quick warm-up
def greet(name):
    return f"Hello, {name}!"

names = ["Aria", "Ben", "Chloe"]
for n in names:
    print(greet(n))

squares = {x: x * x for x in range(1, 6)}
print("Squares:", squares)`,
  },
  {
    id: 'pandas',
    title: 'Data with pandas',
    emoji: '🐼',
    tag: 'pandas · numpy',
    code: `import numpy as np
import pandas as pd

# Make a small table of students and scores
df = pd.DataFrame({
    "name": ["Aria", "Ben", "Chloe", "Dev", "Esha"],
    "math": [88, 72, 95, 60, 81],
    "science": [91, 68, 89, 75, 84],
})
df["average"] = df[["math", "science"]].mean(axis=1)

print(df)
print()
print("Class average:", round(df["average"].mean(), 1))
print("Top student:", df.loc[df["average"].idxmax(), "name"])`,
  },
  {
    id: 'plot',
    title: 'Draw a Chart',
    emoji: '📈',
    tag: 'matplotlib',
    code: `import numpy as np
import matplotlib.pyplot as plt

x = np.linspace(0, 2 * np.pi, 200)

plt.figure(figsize=(6, 3.5))
plt.plot(x, np.sin(x), label="sin(x)")
plt.plot(x, np.cos(x), label="cos(x)")
plt.title("Waves")
plt.legend()
plt.grid(True, alpha=0.3)
plt.show()

print("Chart ready! 📊")`,
  },
  {
    id: 'wine-ml',
    title: 'Wine Classifier (ML)',
    emoji: '🍷',
    tag: 'scikit-learn',
    code: `# Machine learning: classify wines with a Decision Tree
import pandas as pd
from sklearn.datasets import load_wine
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.tree import DecisionTreeClassifier
from sklearn.metrics import accuracy_score, classification_report

# Collect the data
wine = load_wine()

# Convert to a pandas DataFrame
df = pd.DataFrame(data=wine.data, columns=wine.feature_names)
df["target"] = wine.target

# Peek at the data
print(df.head())

# Features / target, standardize, split
X = df.drop("target", axis=1)
y = df["target"]

scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)

X_train, X_test, y_train, y_test = train_test_split(
    X_scaled, y, test_size=0.2, random_state=42
)

# Create and train the model
model = DecisionTreeClassifier(random_state=42)
model.fit(X_train, y_train)

# Predict and evaluate
y_pred = model.predict(X_test)
print("\\nAccuracy:", round(accuracy_score(y_test, y_pred), 3))
print(classification_report(y_test, y_pred))`,
  },
  {
    id: 'wine-plot',
    title: 'ML + Feature Chart',
    emoji: '🌳',
    tag: 'scikit-learn · matplotlib',
    code: `# Which features matter most for classifying wine?
import numpy as np
import matplotlib.pyplot as plt
from sklearn.datasets import load_wine
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier

wine = load_wine()
X_train, X_test, y_train, y_test = train_test_split(
    wine.data, wine.target, test_size=0.2, random_state=42
)

model = RandomForestClassifier(n_estimators=120, random_state=42)
model.fit(X_train, y_train)
print("Accuracy:", round(model.score(X_test, y_test), 3))

# Plot the most important features
importances = model.feature_importances_
order = np.argsort(importances)[-6:]
plt.figure(figsize=(6, 3.5))
plt.barh([wine.feature_names[i] for i in order], importances[order], color="#6366f1")
plt.title("Top features for telling wines apart")
plt.tight_layout()
plt.show()`,
  },
]

export const DEFAULT_PY_EXAMPLE = PY_EXAMPLES[0]
