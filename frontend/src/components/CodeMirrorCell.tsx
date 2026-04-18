/**
 * CodeMirrorCell — Colab-style Python code editor with autocomplete.
 * Replaces plain TextFields in the notebook editor.
 */
import { useEffect, useRef, useCallback } from 'react'
import { EditorView, keymap, placeholder as cmPlaceholder, lineNumbers, highlightActiveLine, highlightActiveLineGutter, drawSelection, dropCursor } from '@codemirror/view'
import { EditorState, Compartment } from '@codemirror/state'
import { python } from '@codemirror/lang-python'
import { oneDark } from '@codemirror/theme-one-dark'
import { autocompletion, completionKeymap, CompletionContext, type Completion } from '@codemirror/autocomplete'
import { defaultKeymap, indentWithTab, history, historyKeymap } from '@codemirror/commands'
import { bracketMatching, indentOnInput, foldGutter, syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language'
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search'

// ── Python + ML Library Autocomplete Keywords ──────────────────────────────

const PYTHON_KEYWORDS = [
    'False', 'None', 'True', 'and', 'as', 'assert', 'async', 'await', 'break',
    'class', 'continue', 'def', 'del', 'elif', 'else', 'except', 'finally',
    'for', 'from', 'global', 'if', 'import', 'in', 'is', 'lambda', 'nonlocal',
    'not', 'or', 'pass', 'raise', 'return', 'try', 'while', 'with', 'yield',
    'print', 'range', 'len', 'type', 'int', 'float', 'str', 'list', 'dict',
    'set', 'tuple', 'bool', 'enumerate', 'zip', 'map', 'filter', 'sorted',
    'reversed', 'isinstance', 'hasattr', 'getattr', 'setattr', 'open',
    'super', 'property', 'staticmethod', 'classmethod', 'abs', 'all', 'any',
    'max', 'min', 'sum', 'round', 'input', 'format', 'iter', 'next',
]

const PANDAS_COMPLETIONS = [
    { label: 'pd.read_csv', detail: '(filepath) → DataFrame', info: 'Read CSV file into DataFrame' },
    { label: 'pd.read_excel', detail: '(filepath) → DataFrame', info: 'Read Excel file into DataFrame' },
    { label: 'pd.read_json', detail: '(filepath) → DataFrame', info: 'Read JSON file into DataFrame' },
    { label: 'pd.DataFrame', detail: '(data, columns) → DataFrame', info: 'Create a DataFrame' },
    { label: 'pd.concat', detail: '(objs, axis) → DataFrame', info: 'Concatenate DataFrames' },
    { label: 'pd.merge', detail: '(left, right, on) → DataFrame', info: 'Merge DataFrames' },
    { label: '.head()', detail: '(n=5) → DataFrame', info: 'Return first n rows' },
    { label: '.tail()', detail: '(n=5) → DataFrame', info: 'Return last n rows' },
    { label: '.describe()', detail: '() → DataFrame', info: 'Generate descriptive statistics' },
    { label: '.info()', detail: '() → None', info: 'Print concise summary' },
    { label: '.shape', detail: '→ tuple', info: 'Return (rows, columns)' },
    { label: '.columns', detail: '→ Index', info: 'Return column labels' },
    { label: '.dtypes', detail: '→ Series', info: 'Return data types' },
    { label: '.value_counts()', detail: '() → Series', info: 'Count unique values' },
    { label: '.groupby()', detail: '(by) → GroupBy', info: 'Group by column(s)' },
    { label: '.fillna()', detail: '(value) → DataFrame', info: 'Fill missing values' },
    { label: '.dropna()', detail: '() → DataFrame', info: 'Drop missing values' },
    { label: '.apply()', detail: '(func) → DataFrame', info: 'Apply function along axis' },
    { label: '.sort_values()', detail: '(by) → DataFrame', info: 'Sort by column values' },
    { label: '.drop()', detail: '(labels) → DataFrame', info: 'Drop rows/columns' },
    { label: '.rename()', detail: '(columns) → DataFrame', info: 'Rename columns' },
    { label: '.isnull()', detail: '() → DataFrame', info: 'Detect missing values' },
    { label: '.corr()', detail: '() → DataFrame', info: 'Correlation matrix' },
    { label: '.plot()', detail: '(kind) → Axes', info: 'Plot data' },
    { label: '.to_csv()', detail: '(filepath)', info: 'Write to CSV file' },
]

const NUMPY_COMPLETIONS = [
    { label: 'np.array', detail: '(object) → ndarray', info: 'Create an array' },
    { label: 'np.zeros', detail: '(shape) → ndarray', info: 'Array of zeros' },
    { label: 'np.ones', detail: '(shape) → ndarray', info: 'Array of ones' },
    { label: 'np.arange', detail: '(start, stop, step) → ndarray', info: 'Range array' },
    { label: 'np.linspace', detail: '(start, stop, num) → ndarray', info: 'Evenly spaced array' },
    { label: 'np.random.rand', detail: '(d0, d1, ...) → ndarray', info: 'Random values [0,1)' },
    { label: 'np.random.randn', detail: '(d0, d1, ...) → ndarray', info: 'Standard normal' },
    { label: 'np.mean', detail: '(a) → scalar', info: 'Compute mean' },
    { label: 'np.std', detail: '(a) → scalar', info: 'Standard deviation' },
    { label: 'np.reshape', detail: '(a, newshape) → ndarray', info: 'Reshape array' },
    { label: 'np.concatenate', detail: '(arrays) → ndarray', info: 'Join arrays' },
    { label: 'np.dot', detail: '(a, b) → ndarray', info: 'Dot product' },
    { label: 'np.sqrt', detail: '(x) → ndarray', info: 'Square root' },
    { label: 'np.exp', detail: '(x) → ndarray', info: 'Exponential' },
    { label: 'np.log', detail: '(x) → ndarray', info: 'Natural logarithm' },
]

const SKLEARN_COMPLETIONS = [
    { label: 'train_test_split', detail: '(X, y, test_size) → tuple', info: 'Split arrays into train/test' },
    { label: 'StandardScaler', detail: '() → Scaler', info: 'Standardize features' },
    { label: 'MinMaxScaler', detail: '() → Scaler', info: 'Scale to [0, 1]' },
    { label: 'LabelEncoder', detail: '() → Encoder', info: 'Encode labels as integers' },
    { label: 'OneHotEncoder', detail: '() → Encoder', info: 'One-hot encode features' },
    { label: 'RandomForestClassifier', detail: '(n_estimators) → Classifier', info: 'Random Forest classifier' },
    { label: 'RandomForestRegressor', detail: '(n_estimators) → Regressor', info: 'Random Forest regressor' },
    { label: 'LogisticRegression', detail: '() → Classifier', info: 'Logistic Regression' },
    { label: 'LinearRegression', detail: '() → Regressor', info: 'Linear Regression' },
    { label: 'SVC', detail: '(kernel) → Classifier', info: 'Support Vector Classifier' },
    { label: 'KNeighborsClassifier', detail: '(n_neighbors) → Classifier', info: 'K-Nearest Neighbors' },
    { label: 'DecisionTreeClassifier', detail: '() → Classifier', info: 'Decision Tree classifier' },
    { label: 'GradientBoostingClassifier', detail: '() → Classifier', info: 'Gradient Boosting' },
    { label: 'accuracy_score', detail: '(y_true, y_pred) → float', info: 'Accuracy classification score' },
    { label: 'confusion_matrix', detail: '(y_true, y_pred) → array', info: 'Confusion matrix' },
    { label: 'classification_report', detail: '(y_true, y_pred) → str', info: 'Classification report' },
    { label: 'mean_squared_error', detail: '(y_true, y_pred) → float', info: 'Mean Squared Error' },
    { label: 'r2_score', detail: '(y_true, y_pred) → float', info: 'R² score' },
    { label: 'cross_val_score', detail: '(estimator, X, y) → array', info: 'Cross-validation scores' },
    { label: 'GridSearchCV', detail: '(estimator, param_grid) → object', info: 'Grid search with CV' },
    { label: 'Pipeline', detail: '(steps) → Pipeline', info: 'Chain transformers and estimators' },
    { label: '.fit()', detail: '(X, y) → self', info: 'Fit model to training data' },
    { label: '.predict()', detail: '(X) → array', info: 'Make predictions' },
    { label: '.transform()', detail: '(X) → array', info: 'Transform data' },
    { label: '.fit_transform()', detail: '(X) → array', info: 'Fit and transform' },
    { label: '.score()', detail: '(X, y) → float', info: 'Return model score' },
]

const MATPLOTLIB_COMPLETIONS = [
    { label: 'plt.plot', detail: '(x, y) → Line2D', info: 'Line plot' },
    { label: 'plt.scatter', detail: '(x, y) → PathCollection', info: 'Scatter plot' },
    { label: 'plt.bar', detail: '(x, height)', info: 'Bar chart' },
    { label: 'plt.hist', detail: '(x, bins)', info: 'Histogram' },
    { label: 'plt.figure', detail: '(figsize)', info: 'Create figure' },
    { label: 'plt.subplot', detail: '(nrows, ncols, index)', info: 'Add subplot' },
    { label: 'plt.show', detail: '()', info: 'Display plot' },
    { label: 'plt.savefig', detail: '(filename)', info: 'Save figure' },
    { label: 'plt.xlabel', detail: '(s)', info: 'Set x-axis label' },
    { label: 'plt.ylabel', detail: '(s)', info: 'Set y-axis label' },
    { label: 'plt.title', detail: '(s)', info: 'Set plot title' },
    { label: 'plt.legend', detail: '()', info: 'Show legend' },
    { label: 'plt.tight_layout', detail: '()', info: 'Adjust layout' },
    { label: 'sns.heatmap', detail: '(data)', info: 'Heatmap plot' },
    { label: 'sns.pairplot', detail: '(data)', info: 'Pair plot' },
    { label: 'sns.boxplot', detail: '(data)', info: 'Box plot' },
    { label: 'sns.countplot', detail: '(data)', info: 'Count plot' },
    { label: 'sns.histplot', detail: '(data)', info: 'Histogram plot' },
    { label: 'sns.scatterplot', detail: '(data)', info: 'Scatter plot' },
]

const IMPORT_SNIPPETS = [
    { label: 'import pandas as pd', detail: 'snippet', info: 'Import pandas' },
    { label: 'import numpy as np', detail: 'snippet', info: 'Import numpy' },
    { label: 'import matplotlib.pyplot as plt', detail: 'snippet', info: 'Import matplotlib' },
    { label: 'import seaborn as sns', detail: 'snippet', info: 'Import seaborn' },
    { label: 'from sklearn.model_selection import train_test_split', detail: 'snippet', info: 'Import train_test_split' },
    { label: 'from sklearn.preprocessing import StandardScaler', detail: 'snippet', info: 'Import StandardScaler' },
    { label: 'from sklearn.metrics import accuracy_score, classification_report', detail: 'snippet', info: 'Import metrics' },
    { label: 'from sklearn.ensemble import RandomForestClassifier', detail: 'snippet', info: 'Import RandomForest' },
    { label: 'import torch', detail: 'snippet', info: 'Import PyTorch' },
    { label: 'import tensorflow as tf', detail: 'snippet', info: 'Import TensorFlow' },
]

function mlCompletions(context: CompletionContext) {
    const word = context.matchBefore(/[\w.]*/)
    if (!word || (word.from === word.to && !context.explicit)) return null

    const text = word.text.toLowerCase()

    const options: Completion[] = []

    // Python keywords
    for (const kw of PYTHON_KEYWORDS) {
        if (kw.toLowerCase().startsWith(text)) {
            options.push({ label: kw, type: 'keyword' })
        }
    }

    // Import snippets
    for (const s of IMPORT_SNIPPETS) {
        if (s.label.toLowerCase().includes(text)) {
            options.push({ label: s.label, type: 'text', detail: s.detail, info: s.info, boost: 2 })
        }
    }

    // Pandas
    for (const c of PANDAS_COMPLETIONS) {
        if (c.label.toLowerCase().includes(text)) {
            options.push({ label: c.label, type: 'function', detail: c.detail, info: c.info })
        }
    }

    // Numpy
    for (const c of NUMPY_COMPLETIONS) {
        if (c.label.toLowerCase().includes(text)) {
            options.push({ label: c.label, type: 'function', detail: c.detail, info: c.info })
        }
    }

    // Sklearn
    for (const c of SKLEARN_COMPLETIONS) {
        if (c.label.toLowerCase().includes(text)) {
            options.push({ label: c.label, type: 'function', detail: c.detail, info: c.info })
        }
    }

    // Matplotlib/Seaborn
    for (const c of MATPLOTLIB_COMPLETIONS) {
        if (c.label.toLowerCase().includes(text)) {
            options.push({ label: c.label, type: 'function', detail: c.detail, info: c.info })
        }
    }

    if (options.length === 0) return null

    return {
        from: word.from,
        options,
        validFor: /^[\w.]*$/,
    }
}

// ── Component Props ─────────────────────────────────────────────────────────

interface CodeMirrorCellProps {
    value: string
    onChange: (value: string) => void
    onRun?: () => void
    onRunAndAdvance?: () => void
    readOnly?: boolean
    placeholder?: string
}

export default function CodeMirrorCell({
    value,
    onChange,
    onRun,
    onRunAndAdvance,
    readOnly = false,
    placeholder = '# Write your Python code here...',
}: CodeMirrorCellProps) {
    const editorRef = useRef<HTMLDivElement>(null)
    const viewRef = useRef<EditorView | null>(null)
    const readOnlyCompartment = useRef(new Compartment())

    const onChangeRef = useRef(onChange)
    onChangeRef.current = onChange
    const onRunRef = useRef(onRun)
    onRunRef.current = onRun
    const onRunAndAdvanceRef = useRef(onRunAndAdvance)
    onRunAndAdvanceRef.current = onRunAndAdvance

    useEffect(() => {
        if (!editorRef.current) return

        const runKeymap = keymap.of([
            {
                key: 'Ctrl-Enter',
                run: () => {
                    onRunRef.current?.()
                    return true
                },
            },
            {
                key: 'Shift-Enter',
                run: () => {
                    onRunAndAdvanceRef.current?.()
                    return true
                },
            },
        ])

        const state = EditorState.create({
            doc: value,
            extensions: [
                lineNumbers(),
                highlightActiveLine(),
                highlightActiveLineGutter(),
                drawSelection(),
                dropCursor(),
                bracketMatching(),
                indentOnInput(),
                foldGutter(),
                highlightSelectionMatches(),
                history(),
                python(),
                oneDark,
                runKeymap,
                keymap.of([
                    ...defaultKeymap,
                    ...historyKeymap,
                    ...completionKeymap,
                    ...searchKeymap,
                    indentWithTab,
                ]),
                autocompletion({
                    override: [mlCompletions],
                    activateOnTyping: true,
                    maxRenderedOptions: 25,
                }),
                readOnlyCompartment.current.of(EditorState.readOnly.of(readOnly)),
                cmPlaceholder(placeholder),
                EditorView.updateListener.of((update) => {
                    if (update.docChanged) {
                        onChangeRef.current(update.state.doc.toString())
                    }
                }),
                EditorView.theme({
                    '&': {
                        fontSize: '13px',
                        fontFamily: '"JetBrains Mono", "Fira Code", "Consolas", monospace',
                        backgroundColor: '#050505',
                    },
                    '.cm-content': {
                        minHeight: '80px',
                        padding: '8px 0',
                        caretColor: '#6366F1',
                    },
                    '.cm-gutters': {
                        backgroundColor: '#0a0a0a',
                        borderRight: '1px solid #1a1a1a',
                        color: '#555',
                    },
                    '.cm-activeLineGutter': {
                        backgroundColor: '#111',
                    },
                    '.cm-activeLine': {
                        backgroundColor: 'rgba(99, 102, 241, 0.04)',
                    },
                    '.cm-cursor': {
                        borderLeftColor: '#6366F1',
                    },
                    '.cm-tooltip-autocomplete': {
                        backgroundColor: '#1a1a1a !important',
                        border: '1px solid #333 !important',
                        borderRadius: '8px !important',
                        overflow: 'hidden',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.5) !important',
                    },
                    '.cm-tooltip-autocomplete > ul': {
                        fontFamily: '"JetBrains Mono", "Fira Code", monospace',
                        fontSize: '12px',
                    },
                    '.cm-tooltip-autocomplete > ul > li': {
                        padding: '4px 12px !important',
                    },
                    '.cm-tooltip-autocomplete > ul > li[aria-selected]': {
                        backgroundColor: 'rgba(99, 102, 241, 0.2) !important',
                        color: '#fff !important',
                    },
                    '.cm-completionLabel': {
                        color: '#e5e7eb',
                    },
                    '.cm-completionDetail': {
                        color: '#6b7280',
                        fontStyle: 'italic',
                        marginLeft: '8px',
                    },
                    '.cm-completionInfo': {
                        backgroundColor: '#111 !important',
                        border: '1px solid #333 !important',
                        color: '#9ca3af',
                        padding: '8px 12px !important',
                        borderRadius: '6px !important',
                    },
                    '.cm-selectionMatch': {
                        backgroundColor: 'rgba(99, 102, 241, 0.15)',
                    },
                    '.cm-searchMatch': {
                        backgroundColor: 'rgba(245, 158, 11, 0.3)',
                        borderRadius: '2px',
                    },
                    '.cm-foldGutter': {
                        width: '14px',
                    },
                    '&.cm-focused': {
                        outline: 'none',
                    },
                }),
            ],
        })

        const view = new EditorView({
            state,
            parent: editorRef.current,
        })

        viewRef.current = view

        return () => {
            view.destroy()
            viewRef.current = null
        }
    }, []) // Only mount once

    // Sync value from parent (e.g., when notebook reloads)
    useEffect(() => {
        const view = viewRef.current
        if (!view) return
        const currentDoc = view.state.doc.toString()
        if (currentDoc !== value) {
            view.dispatch({
                changes: {
                    from: 0,
                    to: currentDoc.length,
                    insert: value,
                },
            })
        }
    }, [value])

    // Sync readOnly
    useEffect(() => {
        const view = viewRef.current
        if (!view) return
        view.dispatch({
            effects: readOnlyCompartment.current.reconfigure(EditorState.readOnly.of(readOnly)),
        })
    }, [readOnly])

    return (
        <div
            ref={editorRef}
            style={{
                borderRadius: 0,
                overflow: 'hidden',
            }}
        />
    )
}
