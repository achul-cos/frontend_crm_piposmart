"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { usePageTitle } from "@/app/lib/hooks/usePageTitle";

// API Imports
import {
  fetchDiscussionThreads,
  createDiscussionThread,
  toggleDiscussionLike,
  deleteDiscussionThread as apiDeleteThread,
  addDiscussionReply,
  deleteDiscussionReply as apiDeleteReply,
  type BackendDiscussionThread,
} from "@/app/lib/api";

// Data Imports
import { GLOSARIUM_DATA } from "./data/glosariumData";
import { BUSINESS_FLOW_DATA } from "./data/businessFlowData";
import { TUTORIAL_DATA } from "./data/tutorialData";

type MainTab = "glosarium" | "business-flow" | "tutorials" | "discussion";

// SVG Icon Components
const BookOpenIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18c-2.305 0-4.408.867-6 2.292m0-14.25v14.25" />
  </svg>
);

const FlowChartIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
  </svg>
);

const LightBulbIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.438a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0H9m1.5-12.75a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0z" />
  </svg>
);

const ChatBubbleIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-.964 0-1.91-.04-2.845-.116a10.88 10.88 0 01-2.91-.84M9 13.5l-3 3v-3.091c-.34-.02-.68-.045-1.02-.072-1.133-.093-1.98-.1.56-1.98-2.193V6.3c0-.969.616-1.813 1.5-2.097a17.94 17.94 0 0112 0c.884.284 1.5 1.128 1.5 2.097v2.1" />
  </svg>
);

const KeyIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
  </svg>
);

const MapPinIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
  </svg>
);

const HeartIcon = ({ className = "h-4 w-4", filled = false }: { className?: string; filled?: boolean }) => (
  <svg className={className} fill={filled ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
  </svg>
);

const CheckCircleIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const HelpIcon = ({ className = "h-5 w-5" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M12 18h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const PlusIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
);

const XMarkIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const ArrowDownTrayIcon = ({ className = "h-3.5 w-3.5" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
  </svg>
);

const ArrowUpRightIcon = ({ className = "h-3.5 w-3.5" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
  </svg>
);

const TrashIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
  </svg>
);

// Thread Interface for discussion
interface DiscussionReply {
  id: string | number;
  authorName: string;
  authorRole: "ADMIN" | "SUPERVISOR" | "SALES" | string;
  content: string;
  createdAt: string;
}

interface DiscussionThread {
  id: string | number;
  channel: string;
  title: string;
  authorName: string;
  authorRole: "ADMIN" | "SUPERVISOR" | "SALES" | string;
  content: string;
  tags: string[];
  likes: number;
  isLiked?: boolean;
  replies: DiscussionReply[];
  createdAt: string;
  solved?: boolean;
}

const INITIAL_THREADS: DiscussionThread[] = [
  {
    id: 1,
    channel: "#tanya-fitur",
    title: "Bagaimana cara menghubungkan Mitra Sales baru dengan akun Sales PIC?",
    authorName: "Budi Sales",
    authorRole: "SALES",
    content: "Halo tim, saya baru menambahkan agen Mitra Sales eksternal. Di mana tombol untuk menetapkan PIC Sales internal yang bertugas membina mitra tersebut?",
    tags: ["Mitra Sales", "PIC Assignment"],
    likes: 5,
    createdAt: "2 jam yang lalu",
    solved: true,
    replies: [
      {
        id: 101,
        authorName: "Siti Admin",
        authorRole: "ADMIN",
        content: "Halo Mas Budi! Buka menu 'Mitra Sales', pilih baris mitra lalu klik tombol 'Detail & PIC'. Di halaman detail terdapat form 'Tugaskan PIC Sales'. Pilihlah akun Sales Anda lalu simpan.",
        createdAt: "1 jam yang lalu",
      },
    ],
  },
];

const DISCORD_CHANNELS = [
  { id: "all", name: "#semua-channel" },
  { id: "#umum", name: "#umum" },
  { id: "#tanya-fitur", name: "#tanya-fitur" },
  { id: "#bug-report", name: "#bug-report" },
  { id: "#masukan-fitur", name: "#masukan-fitur" },
  { id: "#tips-trik", name: "#tips-trik" },
];

export default function BantuanPage() {
  usePageTitle("Bantuan");

  const [activeTab, setActiveTab] = useState<MainTab>("business-flow");

  // User State
  const [currentUserName] = useState(() =>
    typeof window !== "undefined" ? localStorage.getItem("piposmart_user_name") || "User" : "User",
  );
  const [currentUserRole] = useState<"ADMIN" | "SUPERVISOR" | "SALES">(() => {
    if (typeof window === "undefined") return "SALES";
    const savedRoleRaw = (localStorage.getItem("piposmart_user_role") || "SALES").toUpperCase();
    return savedRoleRaw.includes("ADMIN")
      ? "ADMIN"
      : savedRoleRaw.includes("SUPERVISOR")
        ? "SUPERVISOR"
        : "SALES";
  });

  // Tab 1: Glosarium State
  const [glosariumSearch, setGlosariumSearch] = useState("");
  const [glosariumCategory, setGlosariumCategory] = useState<string>("all");

  // Tab 3: Tutorial State
  const [tutorialSearch, setTutorialSearch] = useState("");
  const [selectedMenuKey, setSelectedMenuKey] = useState<string>("all");

  // Tab 4: Discussion Forum State
  const [threads, setThreads] = useState<DiscussionThread[]>(INITIAL_THREADS);
  const [activeChannel, setActiveChannel] = useState<string>("all");
  const [discussionSearch, setDiscussionSearch] = useState("");
  const [selectedThread, setSelectedThread] = useState<DiscussionThread | null>(null);

  // New Thread Modal State
  const [showNewThreadModal, setShowNewThreadModal] = useState(false);
  const [newThreadTitle, setNewThreadTitle] = useState("");
  const [newThreadChannel, setNewThreadChannel] = useState("#tanya-fitur");
  const [newThreadContent, setNewThreadContent] = useState("");
  const [newThreadTags, setNewThreadTags] = useState("");

  // Reply Input State
  const [replyContent, setReplyContent] = useState("");

  // Fetch Threads from Backend API
  const loadBackendThreads = useCallback(async () => {
    try {
      const data: BackendDiscussionThread[] = await fetchDiscussionThreads(activeChannel, discussionSearch);
      if (data && data.length > 0) {
        const mapped: DiscussionThread[] = data.map((t) => ({
          id: t.id,
          channel: t.channel,
          title: t.title,
          authorName: t.authorName,
          authorRole: t.authorRole,
          content: t.content,
          tags: t.tags || ["Diskusi"],
          likes: t.likes || 0,
          isLiked: t.isLiked,
          solved: t.solved,
          createdAt: new Date(t.createdAt).toLocaleDateString("id-ID", {
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          }),
          replies: (t.replies || []).map((r) => ({
            id: r.id,
            authorName: r.authorName,
            authorRole: r.authorRole,
            content: r.content,
            createdAt: new Date(r.createdAt).toLocaleDateString("id-ID", {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            }),
          })),
        }));
        setThreads(mapped);

        if (selectedThread) {
          const updatedSelected = mapped.find((item) => String(item.id) === String(selectedThread.id));
          if (updatedSelected) {
            setSelectedThread(updatedSelected);
          }
        }
      }
    } catch {
      // Fallback silently if offline or token expired
    }
  }, [activeChannel, discussionSearch, selectedThread]);

  useEffect(() => {
    if (activeTab !== "discussion") return;

    const timer = window.setTimeout(() => {
      void loadBackendThreads();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [activeTab, loadBackendThreads]);

  // Filter Glosarium Items
  const filteredGlosarium = useMemo(() => {
    const query = glosariumSearch.toLowerCase().trim();
    return GLOSARIUM_DATA.filter((item) => {
      const matchCategory = glosariumCategory === "all" || item.category === glosariumCategory;
      const matchQuery =
        !query ||
        item.term.toLowerCase().includes(query) ||
        item.technicalDef.toLowerCase().includes(query) ||
        item.analogy.toLowerCase().includes(query) ||
        item.location.toLowerCase().includes(query);
      return matchCategory && matchQuery;
    });
  }, [glosariumSearch, glosariumCategory]);

  // Filter Menu Tutorials
  const filteredTutorials = useMemo(() => {
    const query = tutorialSearch.toLowerCase().trim();
    return TUTORIAL_DATA.filter((tut) => {
      const matchMenu = selectedMenuKey === "all" || tut.menuKey === selectedMenuKey;
      const matchQuery =
        !query ||
        tut.menuName.toLowerCase().includes(query) ||
        tut.summary.toLowerCase().includes(query) ||
        tut.steps.some((s) => s.stepTitle.toLowerCase().includes(query) || s.stepDescription.toLowerCase().includes(query));
      return matchMenu && matchQuery;
    });
  }, [tutorialSearch, selectedMenuKey]);

  // Filter Discussion Threads
  const filteredThreads = useMemo(() => {
    const query = discussionSearch.toLowerCase().trim();
    return threads.filter((t) => {
      const matchChannel = activeChannel === "all" || t.channel === activeChannel;
      const matchQuery =
        !query ||
        t.title.toLowerCase().includes(query) ||
        t.content.toLowerCase().includes(query) ||
        t.tags.some((tag) => tag.toLowerCase().includes(query)) ||
        t.authorName.toLowerCase().includes(query);
      return matchChannel && matchQuery;
    });
  }, [threads, activeChannel, discussionSearch]);

  // Toggle Like Thread
  const handleLikeThread = async (threadId: string | number, event?: React.MouseEvent) => {
    if (event) event.stopPropagation();

    // Optimistic UI update
    setThreads((current) =>
      current.map((t) => {
        if (String(t.id) === String(threadId)) {
          const isLiked = t.isLiked;
          return {
            ...t,
            likes: isLiked ? t.likes - 1 : t.likes + 1,
            isLiked: !isLiked,
          };
        }
        return t;
      }),
    );

    if (selectedThread && String(selectedThread.id) === String(threadId)) {
      setSelectedThread((prev) =>
        prev
          ? {
              ...prev,
              likes: prev.isLiked ? prev.likes - 1 : prev.likes + 1,
              isLiked: !prev.isLiked,
            }
          : null,
      );
    }

    try {
      if (typeof threadId === "number" || !isNaN(Number(threadId))) {
        await toggleDiscussionLike(Number(threadId));
      }
    } catch {
      // Keep optimistic state or reload
    }
  };

  // Delete Thread Handler
  const handleDeleteThread = async (threadId: string | number, event?: React.MouseEvent) => {
    if (event) event.stopPropagation();

    const targetThread = threads.find((t) => String(t.id) === String(threadId));
    if (!targetThread) return;

    const canDelete =
      currentUserRole === "ADMIN" ||
      targetThread.authorName.toLowerCase() === currentUserName.toLowerCase();

    if (!canDelete) {
      alert("Hanya pembuat thread atau Admin yang berhak menghapus thread ini.");
      return;
    }

    if (window.confirm(`Apakah Anda yakin ingin menghapus thread "${targetThread.title}"?`)) {
      setThreads((current) => current.filter((t) => String(t.id) !== String(threadId)));
      if (selectedThread && String(selectedThread.id) === String(threadId)) {
        setSelectedThread(null);
      }

      try {
        if (typeof threadId === "number" || !isNaN(Number(threadId))) {
          await apiDeleteThread(Number(threadId));
        }
      } catch {
        // Handled
      }
    }
  };

  // Delete Reply Handler
  const handleDeleteReply = async (replyId: string | number) => {
    if (!selectedThread) return;

    if (window.confirm("Apakah Anda yakin ingin menghapus balasan ini?")) {
      const updatedReplies = selectedThread.replies.filter((r) => String(r.id) !== String(replyId));

      setThreads((current) =>
        current.map((t) =>
          String(t.id) === String(selectedThread.id) ? { ...t, replies: updatedReplies } : t,
        ),
      );

      setSelectedThread((prev) =>
        prev ? { ...prev, replies: updatedReplies } : null,
      );

      try {
        if (typeof replyId === "number" || !isNaN(Number(replyId))) {
          await apiDeleteReply(Number(replyId));
        }
      } catch {
        // Handled
      }
    }
  };

  // Create New Thread
  const handleCreateThread = async (e: FormEvent) => {
    e.preventDefault();
    if (!newThreadTitle.trim() || !newThreadContent.trim()) return;

    const parsedTags = newThreadTags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    try {
      const created = await createDiscussionThread({
        channel: newThreadChannel,
        title: newThreadTitle.trim(),
        content: newThreadContent.trim(),
        tags: parsedTags.length > 0 ? parsedTags : ["Diskusi"],
      });

      if (created) {
        await loadBackendThreads();
      }
    } catch {
      // Fallback local insertion if offline
      const newThread: DiscussionThread = {
        id: `thread-${Date.now()}`,
        channel: newThreadChannel,
        title: newThreadTitle.trim(),
        authorName: currentUserName,
        authorRole: currentUserRole,
        content: newThreadContent.trim(),
        tags: parsedTags.length > 0 ? parsedTags : ["Diskusi"],
        likes: 1,
        isLiked: true,
        replies: [],
        createdAt: "Baru saja",
      };

      setThreads([newThread, ...threads]);
    }

    setShowNewThreadModal(false);
    setNewThreadTitle("");
    setNewThreadContent("");
    setNewThreadTags("");
  };

  // Submit Reply to Thread
  const handleAddReply = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedThread || !replyContent.trim()) return;

    try {
      if (typeof selectedThread.id === "number" || !isNaN(Number(selectedThread.id))) {
        await addDiscussionReply(Number(selectedThread.id), {
          content: replyContent.trim(),
        });
        await loadBackendThreads();
      }
    } catch {
      // Fallback local reply insertion
      const newReply: DiscussionReply = {
        id: `rep-${Date.now()}`,
        authorName: currentUserName,
        authorRole: currentUserRole,
        content: replyContent.trim(),
        createdAt: "Baru saja",
      };

      const updatedThreads = threads.map((t) => {
        if (String(t.id) === String(selectedThread.id)) {
          return {
            ...t,
            replies: [...t.replies, newReply],
          };
        }
        return t;
      });

      setThreads(updatedThreads);
      setSelectedThread((prev) =>
        prev
          ? {
              ...prev,
              replies: [...prev.replies, newReply],
            }
          : null,
      );
    }

    setReplyContent("");
  };

  const getRoleBadgeStyle = (role: string) => {
    if (role === "ADMIN") return "bg-purple-100 text-purple-700 border-purple-200";
    if (role === "SUPERVISOR") return "bg-amber-100 text-amber-700 border-amber-200";
    return "bg-blue-100 text-blue-700 border-blue-200";
  };

  return (
    <div className="space-y-6 font-sans text-[#1C1C1E]">
      {/* Header Banner */}
      <div className="overflow-hidden rounded-2xl border border-gray-200/60 bg-white shadow-sm">
        <div className="flex flex-col items-start justify-between gap-4 border-b-2 border-[#C92C1E] p-5 md:flex-row md:items-center">
          <div>
            <div className="mb-1 flex items-center gap-2 text-xs font-bold text-gray-500">
              <span>Menu</span>
              <svg
                className="h-3 w-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M9 5l7 7-7 7"
                />
              </svg>
              <span className="text-[#C92C1E]">Pusat Bantuan</span>
            </div>

            <h1 className="text-2xl font-black tracking-tight text-gray-900">
              Pusat Informasi & Bantuan
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Temukan alur bisnis, tutorial, glosarium, dan diskusikan pertanyaan Anda di sini.
            </p>
          </div>
        </div>
      </div>

      {/* 4 Main Sub-Menus / Tabs */}
      <div className="flex flex-wrap gap-2 rounded-xl border border-gray-200/50 bg-gray-100 p-1.5 shadow-sm">
        <button
          onClick={() => setActiveTab("business-flow")}
          className={`flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-bold transition-all ${
            activeTab === "business-flow"
              ? "bg-white text-[#C92C1E] shadow-sm"
              : "text-gray-500 hover:bg-gray-200/50 hover:text-gray-700"
          }`}
        >
          <FlowChartIcon className="h-4 w-4" />
          <span>Alur Bisnis Framework</span>
        </button>

        <button
          onClick={() => setActiveTab("tutorials")}
          className={`flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-bold transition-all ${
            activeTab === "tutorials"
              ? "bg-white text-[#C92C1E] shadow-sm"
              : "text-gray-500 hover:bg-gray-200/50 hover:text-gray-700"
          }`}
        >
          <LightBulbIcon className="h-4 w-4" />
          <span>Tutorial Menu</span>
        </button>

        <button
          onClick={() => setActiveTab("glosarium")}
          className={`flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-bold transition-all ${
            activeTab === "glosarium"
              ? "bg-white text-[#C92C1E] shadow-sm"
              : "text-gray-500 hover:bg-gray-200/50 hover:text-gray-700"
          }`}
        >
          <BookOpenIcon className="h-4 w-4" />
          <span>Glosarium CRM</span>
        </button>

        <button
          onClick={() => setActiveTab("discussion")}
          className={`flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-bold transition-all ${
            activeTab === "discussion"
              ? "bg-white text-[#C92C1E] shadow-sm"
              : "text-gray-500 hover:bg-gray-200/50 hover:text-gray-700"
          }`}
        >
          <ChatBubbleIcon className="h-4 w-4" />
          <span>Diskusi Thread</span>
        </button>
      </div>

      {/* ======================================================================== */}
      {/* TAB 1: ALUR BISNIS FRAMEWORK */}
      {/* ======================================================================== */}
      {activeTab === "business-flow" ? (
        <section className="space-y-6">
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-50 text-[#C92C1E]">
                <FlowChartIcon className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-black text-gray-900">
                  Kerangka Kerja & Alur Bisnis (Business Flow Framework)
                </h2>
                <p className="text-xs font-medium text-gray-500">
                  Visualisasi tahapan alur proses bisnis CRM Piposmart dari prospecting, afiliasi mitra, hingga penetapan KPI.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-8">
            {BUSINESS_FLOW_DATA.map((flow) => (
              <div key={flow.id} className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                  <div>
                    <span className="rounded-full bg-red-50 border border-red-100 px-3 py-1 text-[10px] font-black text-[#C92C1E]">
                      {flow.badge}
                    </span>
                    <h3 className="mt-2 text-base font-black text-gray-900">{flow.title}</h3>
                    <p className="text-xs font-medium text-gray-500">{flow.description}</p>
                  </div>
                </div>

                {/* Steps Visual Grid */}
                <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                  {flow.steps.map((step) => (
                    <div
                      key={step.stepNumber}
                      className="relative flex flex-col justify-between rounded-2xl border border-gray-200 bg-[#FAFAFA] p-4 transition hover:border-red-200 hover:bg-white"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span
                            className={`flex h-8 w-8 items-center justify-center rounded-xl font-black text-white text-xs ${step.iconBg}`}
                          >
                            {step.stepNumber}
                          </span>
                          <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[9px] font-bold text-gray-700">
                            Actor: {step.actor}
                          </span>
                        </div>

                        <h4 className="mt-3 text-xs font-black text-gray-900">{step.title}</h4>
                        <p className="mt-1 text-[11px] font-medium leading-relaxed text-gray-600">
                          {step.description}
                        </p>
                      </div>

                      <div className="mt-4 space-y-1.5 border-t border-gray-200/60 pt-3 text-[10px]">
                        <p className="flex items-center gap-1 font-bold text-gray-500">
                          <ArrowDownTrayIcon className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                          <span>Input: </span>
                          <span className="font-normal text-gray-700">{step.input}</span>
                        </p>
                        <p className="flex items-center gap-1 font-bold text-[#C92C1E]">
                          <ArrowUpRightIcon className="h-3.5 w-3.5 text-[#C92C1E] shrink-0" />
                          <span>Output: </span>
                          <span className="font-semibold text-gray-900">{step.output}</span>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* ======================================================================== */}
      {/* TAB 2: TUTORIAL MENU */}
      {/* ======================================================================== */}
      {activeTab === "tutorials" ? (
        <section className="space-y-6">
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-50 text-[#C92C1E]">
                  <LightBulbIcon className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-gray-900">
                    Panduan & Tutorial Fungsional Per Menu
                  </h2>
                  <p className="text-xs font-medium text-gray-500">
                    Petunjuk penggunaan fitur langkah-demi-langkah untuk seluruh modul di CRM Piposmart.
                  </p>
                </div>
              </div>

              <div className="w-full md:w-80">
                <input
                  type="text"
                  value={tutorialSearch}
                  onChange={(e) => setTutorialSearch(e.target.value)}
                  placeholder="Cari panduan menu..."
                  className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-xs font-bold text-gray-900 outline-none transition focus:border-[#C92C1E] focus:bg-white"
                />
              </div>
            </div>

            {/* Menu Select Pills */}
            <div className="mt-4 flex flex-wrap gap-2 border-t border-gray-100 pt-4">
              <button
                type="button"
                onClick={() => setSelectedMenuKey("all")}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                  selectedMenuKey === "all" ? "bg-slate-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                Semua Menu
              </button>

              {TUTORIAL_DATA.map((tut) => (
                <button
                  key={tut.menuKey}
                  type="button"
                  onClick={() => setSelectedMenuKey(tut.menuKey)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                    selectedMenuKey === tut.menuKey
                      ? "bg-[#C92C1E] text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {tut.menuName}
                </button>
              ))}
            </div>
          </div>

          {/* Tutorial List Cards */}
          <div className="space-y-6">
            {filteredTutorials.map((tut) => (
              <div key={tut.menuKey} className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-2 border-b border-gray-100 pb-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <span className="rounded-full bg-blue-50 border border-blue-100 px-3 py-1 text-[10px] font-black text-blue-700">
                      {tut.category}
                    </span>
                    <h3 className="mt-2 text-lg font-black text-gray-900">{tut.menuName}</h3>
                    <p className="text-xs font-medium text-gray-500">{tut.summary}</p>
                  </div>

                  <span className="self-start rounded-full bg-gray-100 px-3 py-1 text-[11px] font-bold text-gray-700">
                    Akses Role: {tut.targetRole}
                  </span>
                </div>

                {/* Steps Accordion / Cards */}
                <div className="mt-5 space-y-3">
                  {tut.steps.map((st, idx) => (
                    <div key={idx} className="rounded-2xl border border-gray-100 bg-[#FAFAFA] p-4">
                      <h4 className="text-xs font-black text-gray-900">{st.stepTitle}</h4>
                      <p className="mt-1 text-xs leading-relaxed font-medium text-gray-600">
                        {st.stepDescription}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Tips Box */}
                <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-3.5 text-xs font-medium text-emerald-900">
                  <LightBulbIcon className="h-4 w-4 text-emerald-700 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-black text-emerald-800">Tips Penggunaan: </span>
                    <span>{tut.tips}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* ======================================================================== */}
      {/* TAB 3: GLOSARIUM CRM */}
      {/* ======================================================================== */}
      {activeTab === "glosarium" ? (
        <section className="space-y-6">
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-50 text-[#C92C1E]">
                  <BookOpenIcon className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-gray-900">
                    Glosarium Istilah CRM & Operasional Bisnis
                  </h2>
                  <p className="text-xs font-medium text-gray-500">
                    Kamus penjelasan istilah operasional penjualan, kemitraan afiliasi, target KPI, dan manajemen akun CRM Piposmart.
                  </p>
                </div>
              </div>

              {/* Search Bar Glosarium */}
              <div className="w-full md:w-80">
                <input
                  type="text"
                  value={glosariumSearch}
                  onChange={(e) => setGlosariumSearch(e.target.value)}
                  placeholder="Cari istilah CRM, analogi, lokasi menu..."
                  className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-xs font-bold text-gray-900 outline-none transition focus:border-[#C92C1E] focus:bg-white"
                />
              </div>
            </div>

            {/* Filter Category Pills */}
            <div className="mt-4 flex flex-wrap gap-2 border-t border-gray-100 pt-4">
              {[
                { id: "all", label: "Semua Kategori" },
                { id: "pipeline", label: "Penjualan & Pipeline" },
                { id: "kemitraan", label: "Kemitraan & Afiliasi" },
                { id: "target", label: "Target & Performa KPI" },
                { id: "account", label: "Manajemen Akun & Lisensi" },
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setGlosariumCategory(cat.id)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                    glosariumCategory === cat.id
                      ? "bg-slate-900 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Glosarium Cards Grid */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {filteredGlosarium.map((item) => (
              <div
                key={item.id}
                className="flex flex-col justify-between rounded-3xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-red-200 hover:shadow-md"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 border-b border-gray-100 pb-3">
                    <h3 className="text-base font-black text-gray-900">{item.term}</h3>
                    <span className="rounded-full border border-red-100 bg-red-50 px-2.5 py-0.5 text-[10px] font-black text-[#C92C1E]">
                      {item.categoryLabel}
                    </span>
                  </div>

                  <p className="mt-3 text-xs leading-relaxed font-medium text-gray-700">
                    {item.technicalDef}
                  </p>

                  <div className="mt-3 rounded-2xl border border-amber-100 bg-amber-50/60 p-3.5 text-xs font-medium text-amber-900">
                    <div className="flex items-center gap-1.5 font-bold text-amber-800">
                      <KeyIcon className="h-4 w-4 text-amber-600" />
                      <span>Analogi / Contoh Kasus:</span>
                    </div>
                    <p className="mt-1 leading-relaxed">{item.analogy}</p>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2 rounded-xl border border-gray-100 bg-gray-50 p-2.5 text-[11px] font-bold text-gray-600">
                  <MapPinIcon className="h-4 w-4 text-gray-400 shrink-0" />
                  <span>
                    <span className="text-gray-400">Terkait Menu: </span>
                    <code className="text-[#C92C1E]">{item.location}</code>
                  </span>
                </div>
              </div>
            ))}

            {filteredGlosarium.length === 0 ? (
              <div className="col-span-full rounded-3xl border border-dashed border-gray-300 bg-white p-12 text-center">
                <p className="text-sm font-bold text-gray-500">
                  Istilah glosarium &quot;{glosariumSearch}&quot; tidak ditemukan.
                </p>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {/* ======================================================================== */}
      {/* TAB 4: DISKUSI THREAD */}
      {/* ======================================================================== */}
      {activeTab === "discussion" ? (
        <section className="space-y-6">
          {/* Forum Header & Action */}
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-50 text-[#C92C1E]">
                  <ChatBubbleIcon className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-gray-900">
                    Forum Diskusi & Thread Komunitas
                  </h2>
                  <p className="text-xs font-medium text-gray-500">
                    Wadah tanya jawab, laporan kendala, dan diskusi antar pengguna CRM Piposmart.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowNewThreadModal(true)}
                  className="flex items-center gap-2 rounded-2xl bg-[#C92C1E] px-5 py-2.5 text-xs font-black text-white shadow-sm transition hover:bg-red-700"
                >
                  <PlusIcon className="h-4 w-4" />
                  <span>Buat Thread Baru</span>
                </button>
              </div>
            </div>

            {/* Channels Navigation Bar */}
            <div className="mt-5 flex flex-wrap gap-2 border-t border-gray-100 pt-4">
              {DISCORD_CHANNELS.map((ch) => (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => {
                    setActiveChannel(ch.id);
                    setSelectedThread(null);
                  }}
                  className={`rounded-xl px-3.5 py-1.5 text-xs font-black transition ${
                    activeChannel === ch.id
                      ? "bg-slate-900 text-white shadow-sm"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {ch.name}
                </button>
              ))}
            </div>
          </div>

          {/* Main Forum Grid */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Thread List Column */}
            <div className={`${selectedThread ? "lg:col-span-1" : "lg:col-span-3"} space-y-3`}>
              <div className="mb-2">
                <input
                  type="text"
                  value={discussionSearch}
                  onChange={(e) => setDiscussionSearch(e.target.value)}
                  placeholder="Cari judul thread, tag, penulis..."
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-bold text-gray-900 outline-none shadow-sm focus:border-[#C92C1E]"
                />
              </div>

              {filteredThreads.map((t) => {
                const isSelected = String(selectedThread?.id) === String(t.id);
                const canDelete =
                  currentUserRole === "ADMIN" ||
                  t.authorName.toLowerCase() === currentUserName.toLowerCase();

                return (
                  <div
                    key={t.id}
                    onClick={() => setSelectedThread(t)}
                    className={`group relative cursor-pointer rounded-3xl border p-5 transition ${
                      isSelected
                        ? "border-[#C92C1E] bg-red-50/40 shadow-sm"
                        : "border-gray-200 bg-white hover:border-red-200 hover:shadow-sm"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 border-b border-gray-100/80 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-black text-slate-700">
                          {t.channel}
                        </span>
                        {t.solved ? (
                          <span className="flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-[10px] font-black text-green-700">
                            <CheckCircleIcon className="h-3 w-3" />
                            <span>Solved</span>
                          </span>
                        ) : null}
                      </div>

                      {canDelete ? (
                        <button
                          type="button"
                          onClick={(e) => handleDeleteThread(t.id, e)}
                          title="Hapus Thread"
                          className="rounded-xl border border-red-100 bg-red-50 p-1.5 text-red-600 hover:bg-red-600 hover:text-white transition"
                        >
                          <TrashIcon className="h-3.5 w-3.5" />
                        </button>
                      ) : null}
                    </div>

                    <h3 className="mt-3 text-sm font-black text-gray-900 leading-snug">{t.title}</h3>

                    <p className="mt-1 text-xs line-clamp-2 font-medium text-gray-500 leading-relaxed">
                      {t.content}
                    </p>

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 pt-2 text-[11px]">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-800">{t.authorName}</span>
                        <span className={`rounded-full border px-2 py-0.5 text-[9px] font-black ${getRoleBadgeStyle(t.authorRole)}`}>
                          {t.authorRole}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-gray-500 font-bold">
                        <button
                          type="button"
                          onClick={(e) => handleLikeThread(t.id, e)}
                          className={`flex items-center gap-1 hover:text-red-600 ${t.isLiked ? "text-red-600 font-black" : ""}`}
                        >
                          <HeartIcon className="h-3.5 w-3.5" filled={t.isLiked} />
                          <span>{t.likes}</span>
                        </button>
                        <span className="flex items-center gap-1">
                          <ChatBubbleIcon className="h-3.5 w-3.5" />
                          <span>{t.replies.length} Balasan</span>
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {filteredThreads.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-gray-300 bg-white p-10 text-center">
                  <p className="text-xs font-bold text-gray-500">Tidak ada thread ditemukan.</p>
                </div>
              ) : null}
            </div>

            {/* Thread Detail View Column */}
            {selectedThread ? (
              <div className="lg:col-span-2 space-y-4">
                <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                  {/* Thread Header */}
                  <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-slate-900 px-3 py-1 text-[10px] font-black text-white">
                        {selectedThread.channel}
                      </span>
                      {selectedThread.solved ? (
                        <span className="flex items-center gap-1 rounded-full bg-green-100 border border-green-200 px-3 py-1 text-[10px] font-black text-green-700">
                          <CheckCircleIcon className="h-3.5 w-3.5" />
                          <span>Selesai / Solved</span>
                        </span>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-2">
                      {currentUserRole === "ADMIN" ||
                      selectedThread.authorName.toLowerCase() === currentUserName.toLowerCase() ? (
                        <button
                          type="button"
                          onClick={() => handleDeleteThread(selectedThread.id)}
                          className="flex items-center gap-1 rounded-xl border border-red-200 bg-red-50 px-3 py-1 text-xs font-bold text-red-600 hover:bg-red-600 hover:text-white transition"
                        >
                          <TrashIcon className="h-3.5 w-3.5" />
                          <span>Hapus Thread</span>
                        </button>
                      ) : null}

                      <button
                        type="button"
                        onClick={() => setSelectedThread(null)}
                        className="flex items-center gap-1 text-xs font-bold text-gray-400 hover:text-gray-700"
                      >
                        <span>Tutup</span>
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Thread Main Content */}
                  <div className="mt-4">
                    <h2 className="text-lg font-black text-gray-900 leading-snug">{selectedThread.title}</h2>

                    <div className="mt-2 flex items-center gap-2 text-xs font-bold text-gray-500">
                      <span>Oleh: <strong className="text-gray-900">{selectedThread.authorName}</strong></span>
                      <span className={`rounded-full border px-2 py-0.5 text-[9px] font-black ${getRoleBadgeStyle(selectedThread.authorRole)}`}>
                        {selectedThread.authorRole}
                      </span>
                      <span>• {selectedThread.createdAt}</span>
                    </div>

                    <div className="mt-4 rounded-2xl bg-gray-50 p-4 text-xs leading-relaxed font-medium text-gray-800 border border-gray-100">
                      {selectedThread.content}
                    </div>

                    {/* Tags & Like Button */}
                    <div className="mt-4 flex items-center justify-between">
                      <div className="flex flex-wrap gap-1.5">
                        {selectedThread.tags.map((tag, idx) => (
                          <span key={idx} className="rounded-full bg-red-50 text-[#C92C1E] px-2.5 py-0.5 text-[10px] font-bold">
                            #{tag}
                          </span>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleLikeThread(selectedThread.id)}
                        className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-bold transition ${
                          selectedThread.isLiked
                            ? "border-red-200 bg-red-50 text-[#C92C1E]"
                            : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        <HeartIcon className="h-4 w-4" filled={selectedThread.isLiked} />
                        <span>{selectedThread.likes} Like</span>
                      </button>
                    </div>
                  </div>

                  {/* Replies List Section */}
                  <div className="mt-8 space-y-4 border-t border-gray-100 pt-6">
                    <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider">
                      Balasan & Diskusi ({selectedThread.replies.length})
                    </h3>

                    {selectedThread.replies.map((rep) => {
                      const canDeleteReply =
                        currentUserRole === "ADMIN" ||
                        rep.authorName.toLowerCase() === currentUserName.toLowerCase();

                      return (
                        <div key={rep.id} className="rounded-2xl border border-gray-100 bg-[#FAFAFA] p-4">
                          <div className="flex items-center justify-between border-b border-gray-200/60 pb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-gray-900">{rep.authorName}</span>
                              <span className={`rounded-full border px-2 py-0.5 text-[9px] font-black ${getRoleBadgeStyle(rep.authorRole)}`}>
                                {rep.authorRole}
                              </span>
                            </div>

                            <div className="flex items-center gap-3">
                              <span className="text-[10px] font-medium text-gray-400">{rep.createdAt}</span>
                              {canDeleteReply ? (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteReply(rep.id)}
                                  title="Hapus Balasan"
                                  className="text-gray-400 hover:text-red-600 transition"
                                >
                                  <TrashIcon className="h-3.5 w-3.5" />
                                </button>
                              ) : null}
                            </div>
                          </div>

                          <p className="mt-2 text-xs leading-relaxed font-medium text-gray-700">
                            {rep.content}
                          </p>
                        </div>
                      );
                    })}

                    {/* Add Reply Form */}
                    <form onSubmit={handleAddReply} className="mt-6 space-y-3">
                      <textarea
                        rows={3}
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        placeholder="Tulis balasan atau jawaban Anda..."
                        className="w-full rounded-2xl border border-gray-200 bg-white p-3.5 text-xs font-medium text-gray-900 outline-none transition focus:border-[#C92C1E] focus:ring-2 focus:ring-red-100"
                      />

                      <div className="flex justify-end">
                        <button
                          type="submit"
                          disabled={!replyContent.trim()}
                          className="rounded-2xl bg-[#C92C1E] px-5 py-2.5 text-xs font-black text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                        >
                          Kirim Balasan
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {/* Modal Buat Thread Baru */}
          {showNewThreadModal ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
              <div className="w-full max-w-lg rounded-3xl border border-gray-200 bg-white p-6 shadow-xl">
                <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                  <h3 className="text-base font-black text-gray-900">Buat Thread Diskusi Baru</h3>
                  <button
                    type="button"
                    onClick={() => setShowNewThreadModal(false)}
                    className="text-xs font-bold text-gray-400 hover:text-gray-700"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                </div>

                <form onSubmit={handleCreateThread} className="mt-4 space-y-4">
                  <div>
                    <label className="mb-1 block text-xs font-black uppercase text-gray-500">
                      Channel Diskusi
                    </label>
                    <select
                      value={newThreadChannel}
                      onChange={(e) => setNewThreadChannel(e.target.value)}
                      className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-xs font-bold text-gray-900 outline-none focus:border-[#C92C1E]"
                    >
                      {DISCORD_CHANNELS.filter((c) => c.id !== "all").map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-black uppercase text-gray-500">
                      Judul Pertanyaan / Thread
                    </label>
                    <input
                      type="text"
                      value={newThreadTitle}
                      onChange={(e) => setNewThreadTitle(e.target.value)}
                      placeholder="Tuliskan judul pertanyaan secara jelas..."
                      className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-xs font-bold text-gray-900 outline-none focus:border-[#C92C1E]"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-black uppercase text-gray-500">
                      Isi Pertanyaan / Penjelasan
                    </label>
                    <textarea
                      rows={4}
                      value={newThreadContent}
                      onChange={(e) => setNewThreadContent(e.target.value)}
                      placeholder="Jelaskan kendala, pertanyaan, atau masukan Anda..."
                      className="w-full rounded-2xl border border-gray-200 bg-gray-50 p-3.5 text-xs font-medium text-gray-900 outline-none focus:border-[#C92C1E]"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-black uppercase text-gray-500">
                      Tag (dipisahkan koma)
                    </label>
                    <input
                      type="text"
                      value={newThreadTags}
                      onChange={(e) => setNewThreadTags(e.target.value)}
                      placeholder="contoh: Sales, Mitra, Export"
                      className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-xs font-bold text-gray-900 outline-none focus:border-[#C92C1E]"
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowNewThreadModal(false)}
                      className="rounded-2xl border border-gray-200 px-5 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-50"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={!newThreadTitle.trim() || !newThreadContent.trim()}
                      className="flex items-center gap-1.5 rounded-2xl bg-[#C92C1E] px-6 py-2.5 text-xs font-black text-white hover:bg-red-700 disabled:bg-gray-300"
                    >
                      <PlusIcon className="h-4 w-4" />
                      <span>Posting Thread</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
