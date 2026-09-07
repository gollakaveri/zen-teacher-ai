export type LanguageCode = "en" | "te";

export const LANGUAGES: { code: LanguageCode; label: string; native: string }[] = [
  { code: "en", label: "English", native: "English" },
  { code: "te", label: "Telugu", native: "తెలుగు" },
];

export type BoardItemKind =
  | "title"
  | "definition"
  | "point"
  | "keyword"
  | "formula"
  | "step"
  | "flow"
  | "example"
  | "practical"
  | "diagram";

export type BoardItem = {
  kind: BoardItemKind;
  text: string;
};

export type VisualShape = "box" | "rounded" | "circle" | "double" | "diamond" | "text";

export type VisualNode = {
  id: string;
  label: string;
  shape: VisualShape;
  /** 0-100 coordinate space, top-left origin. */
  x: number;
  y: number;
};

export type VisualEdge = {
  from: string;
  to: string;
  label: string;
  dashed: boolean;
};

export type VisualTable = {
  headers: string[];
  rows: string[][];
};

export type VisualChart = {
  xLabel: string;
  yLabel: string;
  /** Simple line/curve series in 0-100 space. */
  points: { x: number; y: number }[];
};

export type BoardVisualKind =
  | "none"
  | "flowchart"
  | "concept"
  | "cycle"
  | "state"
  | "tree"
  | "architecture"
  | "labeled"
  | "table"
  | "graph";

/** The single diagram the teacher draws on the board for this turn. */
export type BoardVisual = {
  kind: BoardVisualKind;
  title: string;
  caption: string;
  nodes: VisualNode[];
  edges: VisualEdge[];
  table: VisualTable;
  chart: VisualChart;
};

/** One spoken beat of the lesson. The board reveals `board` while `say` is spoken. */
export type TeachingSegment = {
  say: string;
  board: BoardItem[];
  /** Diagram node ids drawn during this beat. */
  reveal: string[];
  /** Diagram node ids the teacher points at during this beat. */
  highlight: string[];
};

export type TeachingTurn = {
  subject: string;
  topic: string;
  level: string;
  boardTitle: string;
  visual: BoardVisual;
  segments: TeachingSegment[];
  question: string;
  expectsAnswer: boolean;
  nextAction: string;
};

export type LessonTurnRecord = {
  role: "student" | "teacher";
  text: string;
  turn?: TeachingTurn;
  at: string;
};

export type StudyNotes = {
  topic: string;
  summary: string;
  definitions: { term: string; meaning: string }[];
  keyPoints: string[];
  examples: string[];
  formulas: string[];
  flow: string[];
  revision: string[];
  practice: string[];
  diagrams: BoardVisual[];
};

export type StudentIntent =
  | "new_question"
  | "answer"
  | "explain_again"
  | "another_example"
  | "simpler"
  | "quiz_me"
  | "understood";

export const QUICK_ACTIONS: {
  intent: StudentIntent;
  label: Record<LanguageCode, string>;
  message: Record<LanguageCode, string>;
}[] = [
  {
    intent: "understood",
    label: { en: "I understand", te: "అర్థమైంది" },
    message: { en: "I understand.", te: "నాకు అర్థమైంది." },
  },
  {
    intent: "explain_again",
    label: { en: "Explain again", te: "మళ్ళీ చెప్పండి" },
    message: { en: "I didn't get it. Please explain again.", te: "నాకు అర్థం కాలేదు, మళ్ళీ చెప్పండి." },
  },
  {
    intent: "another_example",
    label: { en: "Another example", te: "మరో ఉదాహరణ" },
    message: { en: "Give me another example.", te: "మరో ఉదాహరణ ఇవ్వండి." },
  },
  {
    intent: "simpler",
    label: { en: "Make it simpler", te: "సులభంగా చెప్పండి" },
    message: { en: "Make it simpler.", te: "ఇంకా సులభంగా చెప్పండి." },
  },
  {
    intent: "quiz_me",
    label: { en: "Ask me a question", te: "ప్రశ్న అడగండి" },
    message: { en: "Ask me a question about this.", te: "దీని గురించి నాకు ఒక ప్రశ్న అడగండి." },
  },
];
