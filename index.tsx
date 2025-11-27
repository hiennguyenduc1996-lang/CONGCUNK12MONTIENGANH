import React, { useState, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import { GoogleGenAI } from "@google/genai";

// Define mammoth type for TypeScript
declare global {
  interface Window {
    mammoth: any;
  }
}

interface TestVariant {
  id: string; // e.g., "101"
  htmlContent: string; // The full test HTML
  answerKeyHtml: string; // Just the extracted answer table
  name: string; // "Mã đề 101"
}

// DEFINING QUESTION TYPES AND THEIR SPECIFIC SUB-TOPICS (FOCUS)
const QUESTION_DATA = [
  { 
    id: 'cloze_ad', 
    name: 'Đục lỗ 1: Bài Quảng Cáo (Advertisement)', 
    topics: [
      { id: 'mixed', name: 'Tổng hợp (Ngẫu nhiên)' },
      { id: 'word_form', name: 'Từ loại (Word Form)' },
      { id: 'word_order', name: 'Trật tự từ (Word Order)' },
      { id: 'reduced_relative', name: 'Rút gọn mệnh đề quan hệ' },
      { id: 'prepositions', name: 'Giới từ (Prepositions)' },
      { id: 'collocations', name: 'Cụm từ cố định (Collocations)' },
      { id: 'gerund_infinitive', name: 'Danh động từ & Động từ nguyên mẫu' }
    ]
  },
  { 
    id: 'cloze_flyer', 
    name: 'Đục lỗ 2: Tờ Rơi (Flyer/Brochure)', 
    topics: [
      { id: 'mixed', name: 'Tổng hợp (Ngẫu nhiên)' },
      { id: 'quantifiers', name: 'Lượng từ (Quantifiers)' },
      { id: 'phrasal_verbs', name: 'Cụm động từ (Phrasal Verbs)' },
      { id: 'vocab_meaning', name: 'Từ vựng - Nghĩa của từ' },
      { id: 'conjunctions', name: 'Liên từ (Conjunctions)' },
      { id: 'semantic_fields', name: 'Từ cùng trường nghĩa' }
    ]
  },
  { 
    id: 'rearrange', 
    name: 'Sắp xếp (Rearrangement)', 
    topics: [
      { id: 'mixed', name: 'Tổng hợp (Ngẫu nhiên)' },
      { id: 'conversation', name: 'Sắp xếp hội thoại (Conversation)' },
      { id: 'letter', name: 'Sắp xếp lá thư (Letter)' },
      { id: 'paragraph', name: 'Sắp xếp đoạn văn (Paragraph)' }
    ]
  },
  { 
    id: 'cloze_text', 
    name: 'Đục lỗ 3: Đoạn văn (Paragraph Cloze)', 
    topics: [
      { id: 'mixed', name: 'Tổng hợp (Ngẫu nhiên)' },
      { id: 'sentence_structure', name: 'Cấu trúc câu' },
      { id: 'relative_clause', name: 'Mệnh đề quan hệ' },
      { id: 'independent_clause', name: 'Mệnh đề độc lập - Nghĩa câu' },
      { id: 'participles', name: 'Hiện tại/Hoàn thành phân từ' }
    ]
  },
  { 
    id: 'reading', 
    name: 'Đọc hiểu (Reading Comprehension)', 
    topics: [
      { id: 'mixed', name: 'Tổng hợp các dạng câu hỏi' },
      { id: 'not_mentioned', name: 'Câu hỏi NOT MENTIONED' },
      { id: 'antonym', name: 'Tìm từ TRÁI NGHĨA' },
      { id: 'reference', name: 'Tìm mối liên hệ/Quy chiếu (Reference)' },
      { id: 'synonym', name: 'Tìm từ ĐỒNG NGHĨA' },
      { id: 'paraphrase', name: 'Câu hỏi PARAPHRASE' },
      { id: 'true_not_true', name: 'Câu hỏi TRUE/NOT TRUE' },
      { id: 'locate_info', name: 'Xác định thông tin thuộc đoạn nào' },
      { id: 'insert_sentence', name: 'Ghép câu vào đoạn văn' },
      { id: 'idiom', name: 'Thành ngữ / Cụm động từ' },
      { id: 'main_idea', name: 'Ý chính (Main Idea)' },
      { id: 'inference', name: 'Suy luận (Inference)' }
    ]
  }
];

const DIFFICULTY_LEVELS = [
  { id: 'easy', name: 'Cơ bản (NB-TH)' },
  { id: 'medium', name: 'Vận dụng (VD)' },
  { id: 'hard', name: 'Vận dụng cao (VDC)' },
];

const VOCAB_TOPICS = [
  "Family and Relationship",
  "Health and Well-Being",
  "Education and Learning",
  "Social Issues",
  "Cultural Diversity",
  "The Environment",
  "Wildlife Conservation and Ecotourism",
  "Inventions",
  "Artitificial Intelligence and Technology",
  "Cities and Urbanisation",
  "The Media and Communication",
  "Work and Career Paths",
  "For a Better World",
  "Life Stories",
  "Becoming Independent",
  "Our Heritage",
  "Entertainment",
  "Personality and Emotions",
  "Vietnam and International Organisations",
  "Money"
];

const GRAMMAR_TOPICS = [
  "Từ loại và Trật tự từ (Word Form & Order)",
  "Danh động từ và Động từ nguyên mẫu (Gerunds & Infinitives)",
  "Lượng từ (Quantifiers)",
  "Giới từ và Cụm giới từ (Prepositions)",
  "Cụm từ chỉ số lượng (Phrases of Quantity)",
  "Liên từ và Trạng từ liên kết (Conjunctions)",
  "Mệnh đề quan hệ (Relative Clauses)",
  "Rút gọn mệnh đề quan hệ (Reduced Relative Clauses)",
  "Các loại mệnh đề (Types of Clauses)",
  "Mệnh đề phân từ (Participle Clauses)",
  "Cụm động từ (Phrasal Verbs)",
  "Collocations",
  "Idioms"
];

const App = () => {
  // --- TABS STATE ---
  const [activeTab, setActiveTab] = useState<'upload' | 'create' | 'vocab' | 'grammar' | 'settings'>('upload');
  const [lastActiveTab, setLastActiveTab] = useState<'upload' | 'create' | 'vocab' | 'grammar'>('upload');

  // --- API KEY STATE ---
  const [userApiKey, setUserApiKey] = useState<string>("");
  const [showApiKey, setShowApiKey] = useState<boolean>(false);

  // --- TAB 1 STATE: FILE UPLOAD & SHUFFLE ---
  const [file, setFile] = useState<File | null>(null);
  const [numCopies, setNumCopies] = useState<number>(1);
  const [generatedVariants, setGeneratedVariants] = useState<TestVariant[]>([]);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [useCustomCodes, setUseCustomCodes] = useState<boolean>(false);
  const [customCodesRaw, setCustomCodesRaw] = useState<string>("");
  const [fileName, setFileName] = useState<string>("");

  // --- TAB 2 STATE: CONTENT CREATION ---
  const [createType, setCreateType] = useState<string>(QUESTION_DATA[0].id);
  const [createFocus, setCreateFocus] = useState<string>(QUESTION_DATA[0].topics[0].id);
  const [createLevel, setCreateLevel] = useState<string>(DIFFICULTY_LEVELS[1].id);
  const [createTopic, setCreateTopic] = useState<string>("");
  const [quantityPassages, setQuantityPassages] = useState<number>(1); 
  const [questionsPerPassage, setQuestionsPerPassage] = useState<number>(5); 
  
  // --- TAB 3 STATE: VOCABULARY TOPICS ---
  const [vocabMode, setVocabMode] = useState<'single' | 'mix'>('single');
  const [selectedVocabTopic, setSelectedVocabTopic] = useState<string>(VOCAB_TOPICS[0]);
  const [selectedMixTopics, setSelectedMixTopics] = useState<string[]>([]);
  const [vocabLevel, setVocabLevel] = useState<string>(DIFFICULTY_LEVELS[1].id);
  const [vocabQuestionCount, setVocabQuestionCount] = useState<number>(10);

  // --- TAB 4 STATE: GRAMMAR ---
  const [selectedGrammarTopic, setSelectedGrammarTopic] = useState<string>(GRAMMAR_TOPICS[0]);
  const [grammarLevel, setGrammarLevel] = useState<string>(DIFFICULTY_LEVELS[1].id);
  const [grammarQuestionCount, setGrammarQuestionCount] = useState<number>(10);

  // --- SHARED STATE ---
  const [createdContentHtml, setCreatedContentHtml] = useState<string>("");
  const contentEditableRef = useRef<HTMLDivElement>(null); 
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingStatus, setLoadingStatus] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  // --- INITIALIZATION ---
  useEffect(() => {
    const storedKey = localStorage.getItem("user_gemini_api_key");
    if (storedKey) setUserApiKey(storedKey);
  }, []);

  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;
    setUserApiKey(newVal);
    localStorage.setItem("user_gemini_api_key", newVal);
  };

  const getApiKey = () => {
    return userApiKey.trim() || process.env.API_KEY || "";
  };

  // Update focus when type changes (Tab 2)
  useEffect(() => {
    const typeObj = QUESTION_DATA.find(t => t.id === createType);
    if (typeObj && typeObj.topics.length > 0) {
      setCreateFocus(typeObj.topics[0].id);
    }
  }, [createType]);

  // Update numCopies automatically when typing custom codes (Tab 1)
  useEffect(() => {
    if (useCustomCodes) {
      const codes = customCodesRaw.split(',').filter(c => c.trim() !== "");
      setNumCopies(codes.length > 0 ? codes.length : 0);
    }
  }, [customCodesRaw, useCustomCodes]);

  // Clear content when switching tabs
  useEffect(() => {
    // Only clear if we are not just toggling settings
    if (activeTab !== 'settings') {
        setError(null);
    }
  }, [activeTab]);

  // --- HELPER FUNCTIONS ---

  const extractAnswerKeyTable = (fullHtml: string): string => {
    const tableRegex = /<table[\s\S]*?<\/table>/gi;
    const tables = fullHtml.match(tableRegex);
    return tables ? tables[tables.length - 1] : "<p>Không tìm thấy bảng đáp án</p>";
  };

  const createWordHtml = (content: string, title: string) => {
    return "<html xmlns:o='urn:schemas-microsoft-com:office:office' " +
      "xmlns:w='urn:schemas-microsoft-com:office:word' " +
      "xmlns='http://www.w3.org/TR/REC-html40'>" +
      "<head><meta charset='utf-8'><title>" + title + "</title>" +
      "<style>" + 
      "body { font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.5; } " + 
      "p { margin-bottom: 6pt; } " +
      ".ans-opt { margin-bottom: 4pt; display: block; } " +
      "mark { background-color: yellow; } " + 
      "table { border-collapse: collapse; width: 100%; margin-top: 20px; border: 2px solid #000; } " +
      "td, th { border: 1px solid #000; padding: 8px; text-align: center; font-weight: bold; font-size: 12pt; background-color: #f0f0f0; } " +
      ".announcement-box { border: 2px solid #000; padding: 15px; margin: 15px 0; background-color: #f9f9f9; width: 100%; } " +
      "</style>" +
      "</head><body>" + content + "</body></html>";
  };

  const splitContentIntoBatches = (htmlContent: string): string[] => {
    // Advanced Regex to find question headers like <b>Question 1.</b>
    // We want to group roughly 5-6 questions per batch to allow AI enough output tokens for detailed answers
    const regex = /<b>Question\s+\d+\./g;
    const matches = [...htmlContent.matchAll(regex)];
    
    if (matches.length === 0) return [htmlContent]; // Fallback if format is different

    const batches: string[] = [];
    const BATCH_SIZE = 5; // Questions per batch

    for (let i = 0; i < matches.length; i += BATCH_SIZE) {
      const startIndex = matches[i].index;
      // End index is the start of the next batch, or end of string
      const endIndex = (i + BATCH_SIZE < matches.length) 
        ? matches[i + BATCH_SIZE].index 
        : htmlContent.length;
      
      batches.push(htmlContent.substring(startIndex!, endIndex));
    }
    return batches;
  };

  // --- SHARED GENERATOR HANDLER FOR SOLUTIONS ---

  const handleGenerateSolution = async () => {
    // 1. Get current content (from ref if edited, else state)
    let currentContent = "";
    if (contentEditableRef.current) {
        currentContent = contentEditableRef.current.innerHTML;
    } else {
        currentContent = createdContentHtml;
    }

    if (!currentContent || currentContent.trim().length < 5) {
        setError("Vui lòng nhập hoặc dán nội dung câu hỏi vào khung bên phải.");
        return;
    }

    setIsLoading(true);
    setError(null);
    setCreatedContentHtml(""); // Clear screen to stream solutions
    
    // 2. Split content intelligently to avoid overload
    // We pass the full content if it's small, or chunks if it's large
    const batches = splitContentIntoBatches(currentContent);
    const totalBatches = batches.length;

    try {
        const ai = new GoogleGenAI({ apiKey: getApiKey() });
        const modelId = "gemini-2.5-flash";

        for (let i = 0; i < totalBatches; i++) {
            setLoadingStatus(`Đang tạo hướng dẫn giải chi tiết (Phần ${i + 1}/${totalBatches})...`);
            
            const batchContent = batches[i];
            const prompt = `
Bạn là giáo viên Tiếng Anh giỏi chuyên môn.
Dưới đây là một phần nội dung bài tập Tiếng Anh (HTML):
---
${batchContent}
---

NHIỆM VỤ:
- Hãy viết **HƯỚNG DẪN GIẢI CHI TIẾT** cho các câu hỏi có trong đoạn văn bản trên.
- **KHÔNG** chép lại đề bài. Chỉ xuất ra phần lời giải.
- Giải thích rõ tại sao đáp án đó đúng (dịch nghĩa từ vựng, giải thích ngữ pháp, cấu trúc câu).
- Nếu có bài đọc, hãy trích dẫn ngắn gọn thông tin trong bài để chứng minh.

ĐỊNH DẠNG OUTPUT (HTML):
<div class="solution-item" style="margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px dashed #ccc;">
  <b>Question X: Đáp án [A/B/C/D]</b>
  <br/>
  <i>Giải thích:</i> ...Nội dung giải thích chi tiết...
</div>
`;
            
            const response = await ai.models.generateContent({
                model: modelId,
                contents: { parts: [{ text: prompt }] },
                config: { temperature: 0.5 } // Lower temp for factual explanations
            });

            const html = (response.text || "").replace(/```html|```/g, "").trim();
            setCreatedContentHtml(prev => prev + html);
        }

    } catch (err: any) {
        setError("Lỗi khi tạo hướng dẫn giải: " + err.message);
        // Restore content if failed
        setCreatedContentHtml(currentContent); 
    } finally {
        setIsLoading(false);
        setLoadingStatus("");
    }
  };


  // --- TAB 1 HANDLERS ---

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setFileName(selectedFile.name);
      setError(null);
      setGeneratedVariants([]);
      setSelectedVariantId(null);
    }
  };

  const fileToGenericPart = async (file: File): Promise<{ inlineData: { data: string; mimeType: string } }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64data = reader.result as string;
        const base64Content = base64data.split(",")[1];
        resolve({ inlineData: { data: base64Content, mimeType: file.type } });
      };
      reader.onerror = () => reject(new Error("Lỗi khi đọc file PDF."));
      reader.readAsDataURL(file);
    });
  };

  const extractHtmlFromDocx = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = function(event) {
        try {
          if (!window.mammoth) return reject(new Error("Thư viện Mammoth chưa tải."));
          const arrayBuffer = event.target?.result;
          if (!arrayBuffer) return reject(new Error("Không đọc được dữ liệu file."));
          
          const options = {
            styleMap: ["highlight => mark", "b => b", "i => i", "u => u", "strike => s"],
            ignoreImage: true 
          };

          window.mammoth.convertToHtml({ arrayBuffer: arrayBuffer }, options)
            .then((result: any) => resolve(result.value))
            .catch((err: any) => reject(new Error("Lỗi Mammoth: " + err.message)));
        } catch (e: any) { reject(new Error("Lỗi xử lý file Word: " + e.message)); }
      };
      reader.onerror = () => reject(new Error("Không thể đọc file."));
      reader.readAsArrayBuffer(file);
    });
  };

  const generateSingleTest = async (ai: GoogleGenAI, modelId: string, contentPart: any, testCode: string): Promise<TestVariant> => {
    const seed = Math.floor(Math.random() * 10000000);

    const systemInstruction = `
Bạn là trợ lý AI chuyên tạo đề Tiếng Anh.
Nhiệm vụ: Tạo đề ôn tập mới (đủ 40 câu) từ tài liệu cung cấp.

QUY TẮC QUAN TRỌNG:
1. **OUTPUT HTML**: Tiêu đề <h3>, Nội dung <p>. Giữ nguyên <mark> highlight.
2. **XÁO TRỘN**:
   - **Bài Đọc Hiểu (Reading)**: GIỮ NGUYÊN thứ tự câu hỏi, CHỈ Xáo trộn đáp án A, B, C, D.
   - **Bài Đục Lỗ (Cloze)**: GIỮ NGUYÊN thứ tự câu hỏi để đảm bảo logic văn bản. 
     **QUAN TRỌNG**: SỬA LẠI số chỗ trống trong bài thành định dạng: **(Số câu)_______** (Ví dụ: **(1)_______**). 
     Xáo trộn đáp án A, B, C, D.
   - **Các dạng bài khác**: Xáo trộn cả câu hỏi và đáp án A, B, C, D.
3. **CÔ LẬP NHÓM BÀI**: Tuyệt đối không để câu hỏi của bài đọc này nhảy sang bài đọc khác.
4. **ĐỊNH DẠNG**:
   - "<b>Question X.</b>" (1-40).
   - Đáp án: <div class="ans-opt">A. ...</div> (xuống dòng).
5. **BẢNG ĐÁP ÁN (BẮT BUỘC DẠNG BẢNG)**:
   - Dựa vào highlight/đáp án, tạo bảng HTML (<table>).
   - Bảng gồm 4 hàng, 10 cột.
   - Nội dung ô: "1.A", "2.B", v.v.
   - Tiêu đề bảng: <h3>Answer Key - Code: ${testCode}</h3>
`;

    const userPrompt = `Tạo mã đề ${testCode}. Seed: ${seed}. Nhớ giữ nguyên thứ tự câu hỏi Reading/Cloze, chỉ xáo option. Bài Cloze phải sửa số thành (X)_______. Các bài khác xáo cả câu hỏi. Bắt buộc tạo BẢNG đáp án chuẩn 4x10 ở cuối.`;

    const response = await ai.models.generateContent({
      model: modelId,
      contents: { parts: [contentPart, { text: userPrompt }] },
      config: { systemInstruction, temperature: 0.95 }
    });

    const cleanHtml = (response.text || "").replace(/```html|```/g, "").trim();
    const answerKey = extractAnswerKeyTable(cleanHtml);

    return {
      id: testCode,
      name: `Mã đề ${testCode}`,
      htmlContent: cleanHtml,
      answerKeyHtml: `<h3 style="margin-top:20px; color: #1e40af;">Mã đề: ${testCode}</h3>${answerKey}`
    };
  };

  const generateTests = async () => {
    if (!file) return setError("Vui lòng chọn file.");
    
    let codesToGenerate: string[] = [];
    if (useCustomCodes) {
       codesToGenerate = customCodesRaw.split(',').map(s => s.trim()).filter(s => s !== "");
       if (codesToGenerate.length === 0) return setError("Nhập ít nhất một mã đề.");
    } else {
       if (numCopies < 1 || numCopies > 10) return setError("Số lượng đề từ 1-10.");
       for(let i = 0; i < numCopies; i++) codesToGenerate.push(Math.floor(100 + Math.random() * 900).toString());
    }

    setIsLoading(true); setError(null); setGeneratedVariants([]);
    
    try {
      const ai = new GoogleGenAI({ apiKey: getApiKey() });
      const modelId = "gemini-2.5-flash"; 
      let contentPart: any = null;

      // 1. Prepare Content
      if (file.type === "application/pdf") {
        setLoadingStatus("Đang đọc file PDF...");
        contentPart = await fileToGenericPart(file);
      } else {
        setLoadingStatus("Đang đọc file Word (Tối ưu hóa)...");
        const extractedHtml = await extractHtmlFromDocx(file);
        contentPart = { text: `SOURCE CONTENT:\n${extractedHtml.substring(0, 800000)}` };
      }

      setLoadingStatus(`Đang xử lý song song ${codesToGenerate.length} đề thi... (Vui lòng đợi)`);

      // 2. Run Parallel Requests
      const variantPromises = codesToGenerate.map(async (code) => {
          const variant = await generateSingleTest(ai, modelId, contentPart, code);
          setGeneratedVariants(prev => {
            const newList = [...prev, variant];
            if (prev.length === 0) setSelectedVariantId(variant.id);
            return newList;
          });
      });

      await Promise.all(variantPromises);

    } catch (err: any) { setError("Lỗi: " + err.message); } 
    finally { setIsLoading(false); setLoadingStatus(""); }
  };

  const downloadDocx = (variant: TestVariant) => {
    const sourceHTML = createWordHtml(variant.htmlContent, variant.name);
    const source = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(sourceHTML);
    const link = document.createElement("a");
    link.href = source; link.download = `De_Thi_${variant.id}.doc`; link.click();
  };

  const downloadMasterKey = () => {
    let combined = "<h1>TỔNG HỢP ĐÁP ÁN</h1>";
    generatedVariants.forEach(v => combined += v.answerKeyHtml + "<br/><hr/><br/>");
    const source = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(createWordHtml(combined, "Master Key"));
    const link = document.createElement("a");
    link.href = source; link.download = `TONG_HOP_DAP_AN.doc`; link.click();
  };

  // --- TAB 2 HANDLERS: CREATE NEW CONTENT ---

  const handleCreateContent = async () => {
    setIsLoading(true);
    setCreatedContentHtml(""); // Reset
    setError(null);

    const typeObj = QUESTION_DATA.find(t => t.id === createType);
    const focusObj = typeObj?.topics.find(t => t.id === createFocus);
    const levelName = DIFFICULTY_LEVELS.find(l => l.id === createLevel)?.name;
    
    const totalPassages = quantityPassages;
    let currentQuestionNum = 1;

    try {
      const ai = new GoogleGenAI({ apiKey: getApiKey() });
      const modelId = "gemini-2.5-flash"; 

      // Loop to handle batching
      for (let i = 0; i < totalPassages; i++) {
        const batchIndex = i + 1;
        setLoadingStatus(`Đang biên soạn bài ${batchIndex}/${totalPassages}...`);

        const prompt = `
Hãy đóng vai một giáo viên Tiếng Anh chuyên nghiệp, chuyên soạn đề thi THPT Quốc Gia (Việt Nam) theo form mới nhất 2025.
Vui lòng soạn thảo bài tập theo yêu cầu chi tiết sau:

**THÔNG TIN CHUNG:**
1. **Loại bài**: ${typeObj?.name}
2. **Trọng tâm kiến thức**: ${focusObj?.name} (Nếu là 'Tổng hợp', hãy trộn lẫn các dạng).
3. **Mức độ**: ${levelName}
4. **Chủ đề**: ${createTopic || "Ngẫu nhiên (Giáo dục, Môi trường, Công nghệ, Đời sống...)"}

**QUAN TRỌNG - CẤU TRÚC:**
- Hãy bắt đầu đánh số câu hỏi từ: **Question ${currentQuestionNum}**.
- Số lượng câu hỏi cần tạo cho bài này: ${questionsPerPassage} câu.
- **Trong các bài đọc điền từ (Cloze/Gap fill), vị trí cần điền phải có định dạng: (Số câu)_______ (Ví dụ: (1)_______).**

**YÊU CẦU ĐỊNH DẠNG HTML (BẮT BUỘC):**
- Sử dụng thẻ <h3> cho tiêu đề bài (VD: Passage ${batchIndex}).
- Sử dụng thẻ <b> cho các từ khóa quan trọng hoặc số thứ tự câu hỏi (VD: <b>Question ${currentQuestionNum}.</b>).
- Các đáp án phải xuống dòng, sử dụng thẻ <div class="ans-opt">A...</div>.
- **BẮT BUỘC**: Cuối phần bài làm này, hãy tạo **BẢNG ĐÁP ÁN (HTML TABLE)** cho riêng các câu hỏi của bài này. Bảng phải có border, nội dung là 1.A, 2.B...

**HƯỚNG DẪN RIÊNG CHO TỪNG LOẠI:**
- Nếu là **Quảng cáo/Thông báo (Announcement/Ad)** hoặc **Tờ rơi (Flyer)**: 
  + HÃY DÙNG thẻ <div class="announcement-box"> để bao quanh nội dung bài đọc.
  + Nội dung nên ngắn gọn, dùng bullet points, định dạng giống thực tế.
- Nếu là **Sắp xếp (Rearrange)**: 
  + Đưa ra các câu/đoạn bị xáo trộn (đánh dấu a, b, c, d...)
  + Câu hỏi trắc nghiệm sẽ là các phương án sắp xếp (VD: A. a-c-b-d).
- Nếu là **Đọc hiểu (Reading)**: 
  + Đảm bảo bài đọc đủ độ dài cho ${questionsPerPassage} câu hỏi.
  + Bao gồm các dạng câu hỏi đã chọn: ${focusObj?.name === 'Tổng hợp' ? 'Trộn lẫn main idea, detail, inference...' : focusObj?.name}.

**VÍ DỤ OUTPUT:**
<h3>Passage ${batchIndex}</h3>
<div class="announcement-box">...Nội dung quảng cáo...</div> (Nếu là bài quảng cáo)
<p>...Nội dung đoạn văn với chỗ trống (${currentQuestionNum})_______ ...</p> (Nếu là bài đọc điền)
<br/>
<b>Question ${currentQuestionNum}.</b> ...
<div class="ans-opt">A. ...</div>
<br/>
<table border="1"><tr><td>${currentQuestionNum}. A</td><td>...</td></tr></table>
`;

        const response = await ai.models.generateContent({
          model: modelId,
          contents: { parts: [{ text: prompt }] },
          config: { temperature: 0.7 } 
        });

        const html = (response.text || "").replace(/```html|```/g, "").trim();
        
        // Append new content immediately
        setCreatedContentHtml(prev => prev + `<div class="batch-result mb-8">${html}</div>`);
        
        // Update question counter
        currentQuestionNum += questionsPerPassage;
      }

    } catch (err: any) {
      setError("Lỗi biên soạn: " + err.message + ". Vui lòng thử lại.");
    } finally {
      setIsLoading(false);
      setLoadingStatus("");
    }
  };

  // --- TAB 3 HANDLERS: VOCAB TOPICS ---

  const handleMixTopicToggle = (topic: string) => {
    setSelectedMixTopics(prev => 
      prev.includes(topic) ? prev.filter(t => t !== topic) : [...prev, topic]
    );
  };

  const handleCreateVocab = async () => {
    setIsLoading(true);
    setCreatedContentHtml("");
    setError(null);

    const topics = vocabMode === 'single' ? [selectedVocabTopic] : selectedMixTopics;
    if (topics.length === 0) {
      setError("Vui lòng chọn ít nhất một chủ đề.");
      setIsLoading(false);
      return;
    }

    const levelName = DIFFICULTY_LEVELS.find(l => l.id === vocabLevel)?.name;
    const totalQuestions = vocabQuestionCount;
    const batchSize = 10; 
    const batches = Math.ceil(totalQuestions / batchSize);
    let currentQ = 1;

    try {
      const ai = new GoogleGenAI({ apiKey: getApiKey() });
      const modelId = "gemini-2.5-flash";

      for (let i = 0; i < batches; i++) {
        const countInBatch = Math.min(batchSize, totalQuestions - (i * batchSize));
        setLoadingStatus(`Đang tạo bộ câu hỏi ${i + 1}/${batches}...`);

        const prompt = `
Hãy đóng vai giáo viên Tiếng Anh.
Nhiệm vụ: Tạo ${countInBatch} câu hỏi trắc nghiệm (Multiple Choice) về từ vựng (Vocabulary) & cụm từ (Collocations).
Chủ đề: ${topics.join(", ")}.
Mức độ: ${levelName}.

YÊU CẦU:
- Bắt đầu đánh số từ: **Question ${currentQ}**.
- Mỗi câu hỏi có 4 đáp án A, B, C, D.
- Định dạng HTML chuẩn:
  + Câu hỏi: <b>Question X.</b> [Nội dung câu hỏi]
  + Đáp án: <div class="ans-opt">A. ...</div> (xuống dòng từng đáp án)
- **BẮT BUỘC**: Cuối mỗi đợt, tạo Bảng Đáp Án (HTML Table) cho các câu hỏi này.

VÍ DỤ OUTPUT:
<b>Question ${currentQ}.</b> ...
<div class="ans-opt">A. ...</div>
<br/>
<table border="1"><tr><td>${currentQ}. A</td>...</tr></table>
`;
        
        const response = await ai.models.generateContent({
          model: modelId,
          contents: { parts: [{ text: prompt }] },
          config: { temperature: 0.8 } 
        });

        const html = (response.text || "").replace(/```html|```/g, "").trim();
        setCreatedContentHtml(prev => prev + `<div class="batch-result mb-8">${html}</div>`);
        currentQ += countInBatch;
      }
    } catch (err: any) {
      setError("Lỗi tạo câu hỏi: " + err.message);
    } finally {
      setIsLoading(false);
      setLoadingStatus("");
    }
  };

  // --- TAB 4 HANDLERS: GRAMMAR ---

  const handleCreateGrammar = async () => {
    setIsLoading(true);
    setCreatedContentHtml("");
    setError(null);

    const levelName = DIFFICULTY_LEVELS.find(l => l.id === grammarLevel)?.name;
    const totalQuestions = grammarQuestionCount;
    const batchSize = 10; 
    const batches = Math.ceil(totalQuestions / batchSize);
    let currentQ = 1;

    try {
      const ai = new GoogleGenAI({ apiKey: getApiKey() });
      const modelId = "gemini-2.5-flash";

      for (let i = 0; i < batches; i++) {
        const countInBatch = Math.min(batchSize, totalQuestions - (i * batchSize));
        setLoadingStatus(`Đang tạo câu hỏi Ngữ pháp ${i + 1}/${batches}...`);

        const prompt = `
Hãy đóng vai giáo viên Tiếng Anh.
Nhiệm vụ: Tạo ${countInBatch} câu hỏi trắc nghiệm (Multiple Choice) về Ngữ pháp (Grammar).
Chuyên đề: ${selectedGrammarTopic}.
Mức độ: ${levelName}.

YÊU CẦU:
- Bắt đầu đánh số từ: **Question ${currentQ}**.
- Câu hỏi cần tập trung sâu vào chuyên đề đã chọn.
- Mỗi câu hỏi có 4 đáp án A, B, C, D.
- Định dạng HTML chuẩn:
  + Câu hỏi: <b>Question X.</b> [Nội dung câu hỏi]
  + Đáp án: <div class="ans-opt">A. ...</div> (xuống dòng từng đáp án)
- **BẮT BUỘC**: Cuối mỗi đợt, tạo Bảng Đáp Án (HTML Table) cho các câu hỏi này.

VÍ DỤ OUTPUT:
<b>Question ${currentQ}.</b> ...
<div class="ans-opt">A. ...</div>
<br/>
<table border="1"><tr><td>${currentQ}. A</td>...</tr></table>
`;
        
        const response = await ai.models.generateContent({
          model: modelId,
          contents: { parts: [{ text: prompt }] },
          config: { temperature: 0.8 } 
        });

        const html = (response.text || "").replace(/```html|```/g, "").trim();
        setCreatedContentHtml(prev => prev + `<div class="batch-result mb-8">${html}</div>`);
        currentQ += countInBatch;
      }
    } catch (err: any) {
      setError("Lỗi tạo câu hỏi ngữ pháp: " + err.message);
    } finally {
      setIsLoading(false);
      setLoadingStatus("");
    }
  };

  const downloadCreatedContent = () => {
    let contentToSave = createdContentHtml;
    if (contentEditableRef.current) {
        contentToSave = contentEditableRef.current.innerHTML;
    }
    
    if (!contentToSave) return;

    let prefix = 'Bien_Soan_AI';
    if (activeTab === 'vocab') prefix = 'Tu_Vung';
    if (activeTab === 'grammar') prefix = 'Ngu_Phap';
    
    const sourceHTML = createWordHtml(contentToSave, "Tai_Lieu_Bien_Soan_AI");
    const source = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(sourceHTML);
    const link = document.createElement("a");
    link.href = source;
    link.download = `${prefix}_${new Date().toISOString().slice(0,10)}.doc`;
    link.click();
  };

  // Find currently selected variant object for Tab 1
  const activeVariant = generatedVariants.find(v => v.id === selectedVariantId) || null;
  const currentTypeObj = QUESTION_DATA.find(t => t.id === createType);

  return (
    <div className="flex flex-col md:flex-row h-screen bg-slate-50 overflow-hidden">
      
      {/* LEFT PANEL: Sidebar / Controls */}
      <div className="w-full md:w-[400px] flex-shrink-0 bg-blue-900 text-white flex flex-col h-full shadow-2xl z-20 relative">
        <div className="p-6 flex-grow overflow-y-auto custom-scrollbar flex flex-col">
          
          {/* Header */}
          <div className="mb-8 flex-shrink-0">
             <h1 className="text-base font-bold tracking-tight text-white/90 uppercase leading-snug">
               CÔNG CỤ HỖ TRỢ NK12 - TIẾNG ANH
             </h1>
          </div>

          {/* TABS SWITCHER */}
          {activeTab === 'settings' ? (
              <button
                onClick={() => setActiveTab(lastActiveTab as any)}
                className="w-full mb-6 py-3 px-4 bg-blue-800 hover:bg-blue-700 text-white rounded-xl flex items-center gap-3 font-bold transition-all shadow-lg border border-blue-600"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Quay lại
              </button>
          ) : (
              <div className="grid grid-cols-2 gap-2 p-1.5 bg-blue-950/50 rounded-xl mb-6 border border-blue-800/50 flex-shrink-0">
                <button onClick={() => setActiveTab('upload')} className={`py-2.5 text-sm font-semibold rounded-lg transition-all ${activeTab === 'upload' ? 'bg-blue-600 text-white shadow-lg' : 'text-blue-300 hover:text-white hover:bg-blue-800'}`}>Tạo Đề</button>
                <button onClick={() => setActiveTab('create')} className={`py-2.5 text-sm font-semibold rounded-lg transition-all ${activeTab === 'create' ? 'bg-blue-600 text-white shadow-lg' : 'text-blue-300 hover:text-white hover:bg-blue-800'}`}>Soạn Bài</button>
                <button onClick={() => setActiveTab('vocab')} className={`py-2.5 text-sm font-semibold rounded-lg transition-all ${activeTab === 'vocab' ? 'bg-blue-600 text-white shadow-lg' : 'text-blue-300 hover:text-white hover:bg-blue-800'}`}>Từ Vựng</button>
                <button onClick={() => setActiveTab('grammar')} className={`py-2.5 text-sm font-semibold rounded-lg transition-all ${activeTab === 'grammar' ? 'bg-blue-600 text-white shadow-lg' : 'text-blue-300 hover:text-white hover:bg-blue-800'}`}>Ngữ Pháp</button>
              </div>
          )}

          {/* === CONTENT FOR TAB 1: UPLOAD === */}
          {activeTab === 'upload' && (
            <div className="space-y-6 animate-fade-in-up">
              {/* Step 1: Upload */}
              <div>
                <div className="flex items-center gap-2 mb-2 text-blue-200 uppercase text-xs font-bold tracking-wider">
                  <span className="w-5 h-5 rounded-full border border-blue-300 flex items-center justify-center text-[10px]">1</span>
                  Tải lên tài liệu
                </div>
                
                <label className="block w-full cursor-pointer group">
                  <div className={`
                    relative border-2 border-dashed rounded-xl p-6 transition-all duration-300
                    ${file ? 'border-green-400 bg-green-500/20' : 'border-blue-400/30 hover:border-blue-300 hover:bg-blue-800/50'}
                  `}>
                    <input 
                      type="file" 
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      accept=".pdf,.docx"
                      onChange={handleFileChange}
                    />
                    <div className="text-center space-y-2 pointer-events-none">
                      {file ? (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mx-auto text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <p className="text-base font-medium text-green-300 truncate px-2">{fileName}</p>
                        </>
                      ) : (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mx-auto text-blue-300/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                          <p className="text-base font-medium text-blue-100">Kéo thả PDF / DOCX</p>
                        </>
                      )}
                    </div>
                  </div>
                </label>
              </div>

              {/* Step 2: Settings */}
              <div>
                 <div className="flex items-center gap-2 mb-2 text-blue-200 uppercase text-xs font-bold tracking-wider">
                  <span className="w-5 h-5 rounded-full border border-blue-300 flex items-center justify-center text-[10px]">2</span>
                  Cấu hình
                </div>

                <div className="mb-3">
                   <label className="flex items-center gap-2 cursor-pointer text-sm text-blue-100">
                      <input 
                        type="checkbox" 
                        checked={useCustomCodes}
                        onChange={(e) => setUseCustomCodes(e.target.checked)}
                        className="w-4 h-4 rounded border-blue-400 text-blue-600 bg-blue-900 focus:ring-blue-500"
                      />
                      <span>Nhập mã đề thủ công</span>
                   </label>
                </div>

                {useCustomCodes ? (
                  <div className="mb-4">
                    <label className="text-sm text-blue-200 block mb-1">Mã đề (cách nhau dấu phẩy):</label>
                    <input 
                      type="text" 
                      placeholder="VD: 101, 102, 103"
                      value={customCodesRaw}
                      onChange={(e) => setCustomCodesRaw(e.target.value)}
                      className="w-full bg-blue-950 border border-blue-700 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                ) : (
                  <div className="mb-4">
                    <label className="text-sm text-blue-200 block mb-1">Số lượng đề:</label>
                    <input 
                      type="number" min="1" max="10" 
                      value={numCopies}
                      onChange={(e) => setNumCopies(parseInt(e.target.value) || 1)}
                      className="w-full bg-blue-950 border border-blue-700 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                )}

                <button
                  onClick={generateTests}
                  disabled={isLoading || !file || (useCustomCodes && numCopies === 0)}
                  className={`w-full py-3.5 rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 transition-all 
                    ${isLoading || !file ? 'bg-blue-950 text-blue-500 cursor-not-allowed border border-blue-800' : 'bg-white hover:bg-blue-50 text-blue-900'}`}
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                      <span className="text-sm">{loadingStatus}</span>
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                      <span>Tạo {numCopies} Mã Đề</span>
                    </>
                  )}
                </button>
              </div>

              {/* Step 3: Result List */}
              {generatedVariants.length > 0 && (
                <div className="animate-fade-in-up">
                  <div className="flex items-center gap-2 mb-2 text-blue-200 uppercase text-xs font-bold tracking-wider">
                    <span className="w-5 h-5 rounded-full border border-blue-300 flex items-center justify-center text-[10px]">3</span>
                    Kết quả
                  </div>
                  <div className="space-y-2 mb-4">
                    {generatedVariants.map((variant) => (
                      <div 
                        key={variant.id} onClick={() => setSelectedVariantId(variant.id)}
                        className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all ${selectedVariantId === variant.id ? 'bg-blue-700 border-blue-500 shadow-md' : 'bg-blue-950/50 border border-blue-800 hover:bg-blue-900'}`}
                      >
                        <span className="font-medium text-sm text-white">{variant.name}</span>
                        <button onClick={(e) => {e.stopPropagation(); downloadDocx(variant);}} className="p-1.5 hover:bg-blue-600 rounded-md text-blue-200 hover:text-white"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg></button>
                      </div>
                    ))}
                  </div>
                  <button onClick={downloadMasterKey} className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-bold flex items-center justify-center gap-2 shadow-md">Tải File Tổng Hợp Đáp Án</button>
                </div>
              )}
            </div>
          )}

          {/* === CONTENT FOR TAB 2: CREATE CONTENT === */}
          {activeTab === 'create' && (
             <div className="space-y-6 animate-fade-in-up">
                <div>
                   <label className="text-sm text-blue-200 block mb-1.5 font-medium">Loại bài tập:</label>
                   <select 
                      value={createType} onChange={(e) => setCreateType(e.target.value)}
                      className="w-full bg-blue-950 border border-blue-700 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-blue-500"
                   >
                      {QUESTION_DATA.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                   </select>
                </div>

                {/* Sub-topic / Focus Selection */}
                <div>
                   <label className="text-sm text-blue-200 block mb-1.5 font-medium">Trọng tâm kiến thức:</label>
                   <select 
                      value={createFocus} onChange={(e) => setCreateFocus(e.target.value)}
                      className="w-full bg-blue-950 border border-blue-700 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-blue-500"
                   >
                      {currentTypeObj?.topics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                   </select>
                </div>

                <div>
                   <label className="text-sm text-blue-200 block mb-1.5 font-medium">Mức độ:</label>
                   <select 
                      value={createLevel} onChange={(e) => setCreateLevel(e.target.value)}
                      className="w-full bg-blue-950 border border-blue-700 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-blue-500"
                   >
                      {DIFFICULTY_LEVELS.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                   </select>
                </div>

                <div>
                  <label className="text-sm text-blue-200 block mb-1.5 font-medium">Chủ đề (Tùy chọn):</label>
                  <input 
                    type="text" placeholder="VD: Environment, Education..." 
                    value={createTopic} onChange={(e) => setCreateTopic(e.target.value)}
                    className="w-full bg-blue-950 border border-blue-700 rounded-lg px-3 py-2.5 text-white placeholder-blue-600 focus:border-blue-500"
                  />
                </div>

                <div className="flex gap-3">
                   <div className="flex-1">
                      <label className="text-sm text-blue-200 block mb-1.5 font-medium">Số bài (Texts):</label>
                      <input 
                        type="number" min="1" 
                        value={quantityPassages} onChange={(e) => setQuantityPassages(parseInt(e.target.value) || 1)}
                        className="w-full bg-blue-950 border border-blue-700 rounded-lg px-3 py-2.5 text-white focus:border-blue-500"
                      />
                   </div>
                   <div className="flex-1">
                      <label className="text-sm text-blue-200 block mb-1.5 font-medium">Số câu/bài:</label>
                      <input 
                        type="number" min="1" max="15" 
                        value={questionsPerPassage} onChange={(e) => setQuestionsPerPassage(parseInt(e.target.value) || 5)}
                        className="w-full bg-blue-950 border border-blue-700 rounded-lg px-3 py-2.5 text-white focus:border-blue-500"
                      />
                   </div>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={handleCreateContent}
                    disabled={isLoading}
                    className={`w-full py-3.5 rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 transition-all 
                      ${isLoading ? 'bg-blue-950 text-blue-500 border border-blue-800' : 'bg-white hover:bg-blue-50 text-blue-900'}`}
                  >
                    {isLoading ? (
                      <>
                          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                          <span className="text-sm">{loadingStatus || "Đang xử lý..."}</span>
                      </>
                    ) : (
                      <>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          <span>Soạn Thảo Ngay</span>
                      </>
                    )}
                  </button>
                  
                  <button
                    onClick={handleGenerateSolution}
                    disabled={isLoading}
                    className="w-full py-3.5 rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 transition-all bg-amber-500 hover:bg-amber-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                     <span>Tạo Hướng Dẫn Giải</span>
                  </button>
                </div>
             </div>
          )}

          {/* === CONTENT FOR TAB 3: VOCABULARY TOPICS === */}
          {activeTab === 'vocab' && (
             <div className="space-y-6 animate-fade-in-up">
                <div>
                   <label className="text-sm text-blue-200 block mb-2 font-medium">Chế độ chọn:</label>
                   <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer bg-blue-950/50 p-2 rounded-lg border border-blue-800 flex-1 justify-center hover:bg-blue-900 transition">
                         <input type="radio" checked={vocabMode === 'single'} onChange={() => setVocabMode('single')} className="text-blue-600 focus:ring-blue-500" />
                         <span className="text-white text-sm font-medium">Chủ đề đơn</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer bg-blue-950/50 p-2 rounded-lg border border-blue-800 flex-1 justify-center hover:bg-blue-900 transition">
                         <input type="radio" checked={vocabMode === 'mix'} onChange={() => setVocabMode('mix')} className="text-blue-600 focus:ring-blue-500" />
                         <span className="text-white text-sm font-medium">Trộn chủ đề</span>
                      </label>
                   </div>
                </div>

                {vocabMode === 'single' ? (
                   <div>
                      <label className="text-sm text-blue-200 block mb-1.5 font-medium">Chọn Chủ đề:</label>
                      <select 
                         value={selectedVocabTopic} onChange={(e) => setSelectedVocabTopic(e.target.value)}
                         className="w-full bg-blue-950 border border-blue-700 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-blue-500"
                      >
                         {VOCAB_TOPICS.map((topic, idx) => <option key={idx} value={topic}>{topic}</option>)}
                      </select>
                   </div>
                ) : (
                   <div>
                      <label className="text-sm text-blue-200 block mb-1.5 font-medium">Chọn các chủ đề muốn trộn:</label>
                      <div className="w-full bg-blue-950 border border-blue-700 rounded-lg p-2 max-h-48 overflow-y-auto custom-scrollbar">
                         {VOCAB_TOPICS.map((topic, idx) => (
                            <label key={idx} className="flex items-center gap-2 p-1.5 hover:bg-blue-900 rounded cursor-pointer">
                               <input 
                                  type="checkbox" 
                                  checked={selectedMixTopics.includes(topic)}
                                  onChange={() => handleMixTopicToggle(topic)}
                                  className="rounded border-blue-500 text-blue-600 bg-blue-900 focus:ring-0"
                               />
                               <span className="text-sm text-blue-100">{topic}</span>
                            </label>
                         ))}
                      </div>
                      <p className="text-xs text-blue-300 mt-1">Đã chọn: {selectedMixTopics.length} chủ đề</p>
                   </div>
                )}

                <div>
                   <label className="text-sm text-blue-200 block mb-1.5 font-medium">Mức độ:</label>
                   <select 
                      value={vocabLevel} onChange={(e) => setVocabLevel(e.target.value)}
                      className="w-full bg-blue-950 border border-blue-700 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-blue-500"
                   >
                      {DIFFICULTY_LEVELS.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                   </select>
                </div>

                <div>
                   <label className="text-sm text-blue-200 block mb-1.5 font-medium">Số lượng câu hỏi:</label>
                   <input 
                     type="number" min="5" max="100"
                     value={vocabQuestionCount} onChange={(e) => setVocabQuestionCount(parseInt(e.target.value) || 10)}
                     className="w-full bg-blue-950 border border-blue-700 rounded-lg px-3 py-2.5 text-white focus:border-blue-500"
                   />
                </div>

                <div className="space-y-3">
                  <button
                    onClick={handleCreateVocab}
                    disabled={isLoading}
                    className={`w-full py-3.5 rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 transition-all 
                      ${isLoading ? 'bg-blue-950 text-blue-500 border border-blue-800' : 'bg-white hover:bg-blue-50 text-blue-900'}`}
                  >
                    {isLoading ? (
                      <>
                          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                          <span className="text-sm">{loadingStatus || "Đang tạo câu hỏi..."}</span>
                      </>
                    ) : (
                      <>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                          <span>Tạo Câu Hỏi</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleGenerateSolution}
                    disabled={isLoading}
                    className="w-full py-3.5 rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 transition-all bg-amber-500 hover:bg-amber-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                     <span>Tạo Hướng Dẫn Giải</span>
                  </button>
                </div>
             </div>
          )}

          {/* === CONTENT FOR TAB 4: GRAMMAR === */}
          {activeTab === 'grammar' && (
             <div className="space-y-6 animate-fade-in-up">
                
                <div>
                   <label className="text-sm text-blue-200 block mb-1.5 font-medium">Chuyên đề Ngữ pháp:</label>
                   <select 
                      value={selectedGrammarTopic} onChange={(e) => setSelectedGrammarTopic(e.target.value)}
                      className="w-full bg-blue-950 border border-blue-700 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-blue-500"
                   >
                      {GRAMMAR_TOPICS.map((topic, idx) => <option key={idx} value={topic}>{topic}</option>)}
                   </select>
                </div>

                <div>
                   <label className="text-sm text-blue-200 block mb-1.5 font-medium">Mức độ:</label>
                   <select 
                      value={grammarLevel} onChange={(e) => setGrammarLevel(e.target.value)}
                      className="w-full bg-blue-950 border border-blue-700 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-blue-500"
                   >
                      {DIFFICULTY_LEVELS.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                   </select>
                </div>

                <div>
                   <label className="text-sm text-blue-200 block mb-1.5 font-medium">Số lượng câu hỏi:</label>
                   <input 
                     type="number" min="5" max="100"
                     value={grammarQuestionCount} onChange={(e) => setGrammarQuestionCount(parseInt(e.target.value) || 10)}
                     className="w-full bg-blue-950 border border-blue-700 rounded-lg px-3 py-2.5 text-white focus:border-blue-500"
                   />
                </div>

                <div className="space-y-3">
                  <button
                    onClick={handleCreateGrammar}
                    disabled={isLoading}
                    className={`w-full py-3.5 rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 transition-all 
                      ${isLoading ? 'bg-blue-950 text-blue-500 border border-blue-800' : 'bg-white hover:bg-blue-50 text-blue-900'}`}
                  >
                    {isLoading ? (
                      <>
                          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                          <span className="text-sm">{loadingStatus || "Đang tạo câu hỏi..."}</span>
                      </>
                    ) : (
                      <>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                          <span>Tạo Câu Hỏi Ngữ Pháp</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleGenerateSolution}
                    disabled={isLoading}
                    className="w-full py-3.5 rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 transition-all bg-amber-500 hover:bg-amber-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                     <span>Tạo Hướng Dẫn Giải</span>
                  </button>
                </div>
             </div>
          )}

          {/* === CONTENT FOR TAB 5: SETTINGS (NEW) === */}
          {activeTab === 'settings' && (
              <div className="space-y-6 animate-fade-in-up">
                  <div className="bg-blue-950/50 p-4 rounded-xl border border-blue-800/30">
                      <h3 className="text-white font-bold text-sm mb-3 border-b border-blue-800 pb-2">THÔNG TIN TÁC GIẢ</h3>
                      <div className="flex items-center gap-3 mb-2">
                          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg">H</div>
                          <div>
                              <p className="text-white font-bold text-sm">Nguyễn Đức Hiền</p>
                              <p className="text-blue-300 text-xs">Giáo viên Vật Lí</p>
                          </div>
                      </div>
                      <p className="text-blue-200 text-xs leading-relaxed italic">
                          Trường THCS và THPT Nguyễn Khuyến Bình Dương.
                      </p>
                  </div>

                  <div className="bg-blue-950/50 p-4 rounded-xl border border-blue-800/30">
                    <h3 className="text-white font-bold text-sm mb-3 border-b border-blue-800 pb-2">CẤU HÌNH HỆ THỐNG</h3>
                    <label className="text-xs font-bold text-blue-300 uppercase mb-2 block flex items-center gap-1">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
                        Google Gemini API Key
                    </label>
                    <div className="relative">
                        <input 
                        type={showApiKey ? "text" : "password"}
                        value={userApiKey}
                        onChange={handleApiKeyChange}
                        placeholder="Dán API Key của bạn..."
                        className="w-full bg-blue-900/50 border border-blue-700/50 rounded-lg pl-3 pr-10 py-2 text-xs text-white placeholder-blue-500 focus:outline-none focus:border-blue-400 mb-1"
                        />
                        <button 
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-blue-400 hover:text-white"
                        >
                        {showApiKey ? (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        )}
                        </button>
                    </div>
                    <p className="text-[10px] text-blue-400 italic mt-1">Key được lưu trong trình duyệt của bạn.</p>
                  </div>
              </div>
          )}
          
          {error && <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 text-red-300 rounded-lg text-sm font-medium">{error}</div>}

        </div>
        
        {/* BOTTOM: SETTINGS BUTTON & FOOTER */}
        <div className="p-4 bg-blue-950 text-blue-400 text-xs border-t border-blue-800">
           {/* Settings Trigger */}
           <button 
              onClick={() => {
                if (activeTab !== 'settings') setLastActiveTab(activeTab);
                setActiveTab('settings');
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-3 transition-colors ${activeTab === 'settings' ? 'bg-blue-800 text-white' : 'hover:bg-blue-900 text-blue-300'}`}
           >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="font-bold uppercase tracking-wider">Cài Đặt</span>
           </button>
           <div className="text-center font-medium">
             <p>© 2025 Công cụ hỗ trợ NK12 - Tiếng Anh</p>
           </div>
        </div>
      </div>

      {/* RIGHT PANEL: Result Preview */}
      <div className="flex-1 bg-white h-full overflow-hidden flex flex-col relative font-sans">
        
        {/* Toolbar */}
        <div className="bg-white border-b border-gray-100 px-6 py-4 flex justify-between items-center z-10 min-h-[70px]">
          <h2 className="font-bold text-xl text-slate-800 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {activeTab === 'upload' 
               ? (activeVariant ? `Xem trước: ${activeVariant.name}` : 'Xem trước đề thi') 
               : (activeTab === 'vocab' ? 'Câu hỏi Chủ đề (Vocabulary)' : (activeTab === 'grammar' ? 'Câu hỏi Ngữ pháp' : (activeTab === 'settings' ? 'Thông tin & Cài đặt' : 'Nội dung biên soạn')))}
          </h2>
          
          <div className="flex gap-2">
            {activeTab === 'upload' && activeVariant && (
              <button onClick={() => downloadDocx(activeVariant)} className="px-5 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm flex items-center gap-2 transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                Tải đề này (.doc)
              </button>
            )}
            {(activeTab === 'create' || activeTab === 'vocab' || activeTab === 'grammar') && createdContentHtml && (
               <button onClick={downloadCreatedContent} className="px-5 py-2.5 text-sm font-bold text-white bg-green-600 hover:bg-green-700 rounded-lg shadow-sm flex items-center gap-2 transition-all">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  Tải File Soạn (.doc)
               </button>
            )}
          </div>
        </div>

        {/* Scrollable Document Container */}
        <div className="flex-1 overflow-y-auto p-0 custom-scrollbar flex justify-center bg-white">
           <style>{`
                .generated-content { font-family: 'Be Vietnam Pro', 'Times New Roman', serif; }
                .generated-content table { width: 100%; border-collapse: collapse; margin-top: 24px; font-size: 16px; border: 2px solid #1e40af; background-color: #fff; }
                .generated-content th, .generated-content td { border: 1px solid #94a3b8; padding: 10px; text-align: center; font-weight: 600; color: #0f172a; font-size: 16px; }
                .generated-content tr:nth-child(even) { background-color: #f0f9ff; }
                .generated-content mark { background-color: yellow; color: black; }
                .generated-content h3 { margin-top: 28px; margin-bottom: 14px; color: #1e40af; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; font-weight: 800; font-size: 1.4em; }
                .generated-content h4 { font-weight: 700; margin-bottom: 10px; }
                .generated-content .ans-opt { display: block; margin-bottom: 6px; font-size: 17px; }
                .generated-content b { color: #0f172a; font-weight: 700; }
                .generated-content p { margin-bottom: 12px; font-size: 17px; line-height: 1.6; }
                .generated-content .announcement-box { border: 2px solid #333; padding: 20px; margin: 24px 0; background-color: #f8fafc; border-radius: 6px; }
                .batch-result { margin-bottom: 50px; }
                .solution-item { background: #fff9ed; border: 1px solid #fed7aa; padding: 20px; margin-bottom: 20px; border-radius: 8px; font-size: 17px; }
                .solution-item b { color: #c2410c; }
                .solution-item i { color: #475569; }
              `}</style>

           {/* VIEW FOR TAB 1 */}
           {activeTab === 'upload' && (
              activeVariant ? (
                <div className="w-full max-w-[900px] bg-white min-h-full p-[40px] md:p-[60px] animate-fade-in-up border-x border-slate-50 mx-auto">
                  <div className="generated-content prose prose-slate max-w-none text-lg leading-relaxed text-gray-900" dangerouslySetInnerHTML={{ __html: activeVariant.htmlContent }} />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                  <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  </div>
                  <p className="text-xl font-medium text-slate-400">Chưa có đề thi nào</p>
                </div>
              )
           )}

           {/* VIEW FOR SETTINGS */}
           {activeTab === 'settings' && (
              <div className="w-full h-full bg-slate-50 flex items-center justify-center animate-fade-in-up p-8">
                 <div className="bg-white max-w-2xl w-full rounded-2xl shadow-xl p-10 border border-blue-100 text-center">
                    <div className="w-24 h-24 bg-blue-600 text-white rounded-full flex items-center justify-center text-4xl font-bold mx-auto mb-6 shadow-lg">H</div>
                    <h2 className="text-3xl font-bold text-blue-900 mb-2">Nguyễn Đức Hiền</h2>
                    <p className="text-blue-500 font-semibold text-lg mb-6">Giáo viên Vật Lí</p>
                    <div className="h-1 w-24 bg-blue-100 mx-auto mb-6"></div>
                    <p className="text-gray-600 text-lg leading-relaxed mb-8">
                       Trường THCS và THPT Nguyễn Khuyến Bình Dương
                    </p>
                    <div className="bg-blue-50 rounded-xl p-6 border border-blue-100 text-sm text-blue-800">
                       <p className="font-semibold mb-2">Thông tin ứng dụng</p>
                       <p>Phiên bản: 1.2.0 (Cập nhật tính năng tạo đề & biên soạn AI)</p>
                       <p className="mt-1">© 2025 Bản quyền thuộc về tác giả.</p>
                    </div>
                 </div>
              </div>
           )}

           {/* VIEW FOR TAB 2, 3 & 4 */}
           {(activeTab === 'create' || activeTab === 'vocab' || activeTab === 'grammar') && (
              <div className="w-full h-full bg-white p-4 md:p-8 animate-fade-in-up">
                <div 
                    ref={contentEditableRef}
                    contentEditable={true}
                    suppressContentEditableWarning={true}
                    className="generated-content prose prose-slate max-w-none w-full text-lg leading-relaxed text-gray-900 outline-none focus:ring-2 ring-blue-100 rounded-lg p-8 border border-gray-200 shadow-sm"
                    style={{ minHeight: 'calc(100vh - 180px)' }}
                    dangerouslySetInnerHTML={{ __html: createdContentHtml }}
                />
                 {isLoading && (
                    <div className="mt-4 p-4 text-center text-blue-600 bg-blue-50 rounded-lg animate-pulse font-medium">
                       {loadingStatus || "Đang tải thêm..."}
                    </div>
                 )}
                 {!createdContentHtml && !isLoading && (
                    <div className="absolute top-[30%] left-0 w-full text-center pointer-events-none opacity-40">
                       <p className="text-xl text-slate-400 font-medium">Dán câu hỏi vào đây hoặc sử dụng công cụ bên trái để tạo...</p>
                    </div>
                 )}
              </div>
           )}

        </div>
      </div>
    </div>
  );
};

const root = createRoot(document.getElementById("root")!);
root.render(<App />);
