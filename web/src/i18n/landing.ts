export interface PromptItem {
  label: string;
  text: string;
}

export interface LocaleData {
  documentTitle: string;
  brandLabel: string;
  navHome: string;
  navArticles: string;
  navSkill: string;
  kicker: string;
  title: string;
  subtitle: string;
  installStep: string;
  installLink: string;
  githubStar: string;
  installCmd: string;
  artCommandLabel: string;
  artCardSearchTitle: string;
  artCardSearchText: string;
  artCardResourceTitle: string;
  artCardResourceText: string;
  artCardEvidenceTitle: string;
  artCardEvidenceText: string;
  promptLabel: string;
  promptTitle: string;
  promptIntro: string;
  prompts: PromptItem[];
  footerCopy: string;
  footerTeamHeading: string;
  footerAboutLink: string;
  footerTermsLink: string;
  footerPrivacyLink: string;
  footerActivitiesHeading: string;
  footerTranslationHeading: string;
  footerChineseSiteLink: string;
}

export const localeData: Record<string, LocaleData> = {
  zh: {
    documentTitle: "wwdc-quick-look · 落地页",
    brandLabel: "SwiftGGTeam 技能",
    navHome: "首页",
    navArticles: "文章",
    navSkill: "技能",
    kicker: "SwiftGGTeam 技能",
    title: "wwdc-quick-look",
    subtitle: "一条命令安装到你的智能体。之后直接用提示词检索 WWDC 课程、资源链接、代码片段和逐字稿。",
    installStep: "一键安装",
    installLink: "去 skills.sh 查看",
    githubStar: "在 GitHub 上加星标",
    installCmd: "npx skills add SwiftGGTeam/wwdc-quick-look-skill",
    artCommandLabel: "安装命令",
    artCardSearchTitle: "检索课程",
    artCardSearchText: "按主题、平台和关键词查找 WWDC 内容。",
    artCardResourceTitle: "打开资源",
    artCardResourceText: "直达 Apple 文档、示例代码和相关链接。",
    artCardEvidenceTitle: "读取依据",
    artCardEvidenceText: "按需提取代码标签和逐字稿行。",
    promptLabel: "提示词示例",
    promptTitle: "直接询问 WWDC 档案。",
    promptIntro: "安装完成后，在支持技能的聊天环境里直接发这些提示词：",
    prompts: [
      {
        label: "检索",
        text: "请你用 wwdc-quick-look：列出 2025 年包含\"visionOS\"和\"SwiftUI\"关键词的 WWDC 课程，给我标题和时间点。"
      },
      {
        label: "课程详情",
        text: "请用 wwdc-quick-look 查询 WWDC25 中 code=290 的课程详情，并返回 Apple 官方资源链接、相关文档和演示地址。"
      },
      {
        label: "逐字稿",
        text: "用 wwdc-quick-look：找 WWDC24 第 150 号课程的逐字稿，并只截取包含\"privacy\"相关的前 20 行。"
      }
    ],
    footerCopy:
      "SwiftGG 是一个 NGO 组织，一直尝试将社区里有前瞻性的、有价值的内容呈现到大家视野中，除了承担内容桥梁，也连接创作者与更宽广的视角。",
    footerTeamHeading: "团队",
    footerAboutLink: "关于",
    footerTermsLink: "条款",
    footerPrivacyLink: "隐私",
    footerActivitiesHeading: "活动",
    footerTranslationHeading: "翻译组",
    footerChineseSiteLink: "中文站"
  },
  en: {
    documentTitle: "wwdc-quick-look · Landing Page",
    brandLabel: "SwiftGGTeam Skill",
    navHome: "Home",
    navArticles: "Articles",
    navSkill: "Skill",
    kicker: "SwiftGGTeam skill",
    title: "wwdc-quick-look",
    subtitle: "Install it into your agent with one command. Then query WWDC sessions, Resources, Code tabs, and transcripts directly from prompts.",
    installStep: "Install",
    installLink: "Open on skills.sh",
    githubStar: "Star on GitHub",
    installCmd: "npx skills add SwiftGGTeam/wwdc-quick-look-skill",
    artCommandLabel: "Install command",
    artCardSearchTitle: "Search sessions",
    artCardSearchText: "Find WWDC talks by topic, platform, and keyword.",
    artCardResourceTitle: "Open resources",
    artCardResourceText: "Jump to Apple docs, sample code, and related links.",
    artCardEvidenceTitle: "Read evidence",
    artCardEvidenceText: "Pull code tabs and transcript lines on demand.",
    promptLabel: "Prompt examples",
    promptTitle: "Ask the archive directly.",
    promptIntro: "After installation, call the skill in a supported chat with prompts like:",
    prompts: [
      {
        label: "Search",
        text: "Using WWDC Quick Look, list WWDC sessions in 2025 containing the keywords visionOS and SwiftUI, and return titles and timeline hints."
      },
      {
        label: "Session",
        text: "With WWDC Quick Look, show details for WWDC25 session code=290, including Apple resource links, documentation and demo repository URLs."
      },
      {
        label: "Transcript",
        text: "Use WWDC Quick Look to fetch WWDC24 session code=150 transcript and return only the first 20 lines around the keyword privacy."
      }
    ],
    footerCopy:
      "SwiftGG is an NGO-style community that brings forward-looking, valuable Apple ecosystem content into view and helps creators connect with broader perspectives.",
    footerTeamHeading: "Team",
    footerAboutLink: "About",
    footerTermsLink: "Terms",
    footerPrivacyLink: "Privacy",
    footerActivitiesHeading: "Events",
    footerTranslationHeading: "Translation",
    footerChineseSiteLink: "Chinese Site"
  },
  ja: {
    documentTitle: "wwdc-quick-look · ランディングページ",
    brandLabel: "SwiftGGTeam スキル",
    navHome: "ホーム",
    navArticles: "記事",
    navSkill: "スキル",
    kicker: "SwiftGGTeam スキル",
    title: "wwdc-quick-look",
    subtitle: "1コマンドでAgentにインストール。プロンプトからWWDCセッション、リソース、コードタブ、文字起こしを直接検索できます。",
    installStep: "インストール",
    installLink: "skills.sh を開く",
    githubStar: "GitHub でスター",
    installCmd: "npx skills add SwiftGGTeam/wwdc-quick-look-skill",
    artCommandLabel: "インストールコマンド",
    artCardSearchTitle: "セッション検索",
    artCardSearchText: "テーマ、プラットフォーム、キーワードでWWDCセッションを探します。",
    artCardResourceTitle: "リソースを開く",
    artCardResourceText: "Appleドキュメント、サンプルコード、関連リンクへ移動します。",
    artCardEvidenceTitle: "根拠を読む",
    artCardEvidenceText: "必要に応じてコードタブと文字起こし行を取り出します。",
    promptLabel: "プロンプト例",
    promptTitle: "WWDCアーカイブに直接聞く。",
    promptIntro: "導入後、skills対応のチャットで直接以下のように入力してください：",
    prompts: [
      {
        label: "検索",
        text: "wwdc-quick-lookを使って、2025年で「visionOS」「SwiftUI」を含むセッションを一覧化し、タイトルと開始情報を返してください。"
      },
      {
        label: "セッション",
        text: "WWDC25のセッションコード290の詳細をwwdc-quick-lookで表示し、Apple公式リソース・ドキュメント・デモURLを返してください。"
      },
      {
        label: "文字起こし",
        text: "WWDC24のセッションコード150の文字起こしをwwdc-quick-lookで取得し、「privacy」を含む行を先頭から20行だけ返してください。"
      }
    ],
    footerCopy:
      "SwiftGGは、Appleエコシステムの先進的で価値あるコンテンツを届け、クリエイターとより広い視点をつなぐコミュニティです。",
    footerTeamHeading: "チーム",
    footerAboutLink: "概要",
    footerTermsLink: "規約",
    footerPrivacyLink: "プライバシー",
    footerActivitiesHeading: "イベント",
    footerTranslationHeading: "翻訳",
    footerChineseSiteLink: "中国語サイト"
  }
};

export type LangCode = "zh" | "en" | "ja";
export const defaultLang: LangCode = "zh";
