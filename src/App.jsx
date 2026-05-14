import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, onSnapshot, addDoc, updateDoc, getDoc } from 'firebase/firestore';
import { BookOpen, Upload, Home, User, Heart, Download, Tag, MessageSquare, ThumbsUp, ChevronLeft, ChevronRight, Search, Clock, FileText, Layers } from 'lucide-react';

const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {
  // Fallback mock config for local testing if needed
  apiKey: "mock-key", projectId: "mock-project"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'novel-app-default';

const Toast = ({ message, type = 'info', onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = type === 'error' ? 'bg-red-500' : type === 'success' ? 'bg-emerald-500' : 'bg-blue-500';
  return (
    <div className={`fixed bottom-4 right-4 ${bgColor} text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center transition-all animate-bounce`}>
      {message}
    </div>
  );
};

export default function NovelApp() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState({ name: '匿名读者', favorites: [] });
  const [novels, setNovels] = useState([]);
  
  // Navigation & View State
  const [currentView, setCurrentView] = useState('home'); // home, upload, profile, read
  const [selectedNovel, setSelectedNovel] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // UI State
  const [toast, setToast] = useState(null);

  // Upload Form State
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadGenre, setUploadGenre] = useState('短篇');
  const [uploadAuthor, setUploadAuthor] = useState('');
  const [uploadSeries, setUploadSeries] = useState('');
  const [uploadFileContent, setUploadFileContent] = useState('');
  const [uploadFileName, setUploadFileName] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Profile Edit State
  const [editName, setEditName] = useState('');

  const [regQQ, setRegQQ] = useState('');
  const [regName, setRegName] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  const showToast = (message, type = 'info') => setToast({ message, type });

  const ALLOWED_QQS = ['123456', '888888', '123456789', '999999']; // 模拟后台白名单

  const handleRegister = async (e) => {
    e.preventDefault();
    const qq = regQQ.trim();
    const name = regName.trim();

    if (!ALLOWED_QQS.includes(qq)) {
      showToast("该QQ号不在系统白名单中，无法注册！", "error");
      return;
    }
    if (!name) {
      showToast("请输入昵称！", "error");
      return;
    }

    setIsRegistering(true);
    try {
      // 验证 QQ 是否已被注册 (利用独立文档确保全局唯一性)
      const qqRef = doc(db, 'artifacts', appId, 'public', 'data', 'registered_qqs', qq);
      const qqSnap = await getDoc(qqRef);
      
      if (qqSnap.exists() && qqSnap.data().uid !== user.uid) {
        showToast("该QQ号已被其他用户注册！", "error");
        setIsRegistering(false);
        return;
      }

      // 登记 QQ 占用状态
      await setDoc(qqRef, { uid: user.uid, timestamp: Date.now() });
      
      // 更新当前用户身份为已注册
      const profileRef = doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'data');
      await updateDoc(profileRef, { 
        qq: qq,
        name: name,
        isRegistered: true 
      });

      showToast("注册成功！已解锁全部功能。", "success");
      setEditName(name);
    } catch (err) {
      console.error("Registration error:", err);
      showToast("注册失败，请检查网络环境", "error");
    }
    setIsRegistering(false);
  };

  const renderRegistrationPrompt = (message) => (
    <div className="max-w-md mx-auto p-6 mt-20 animate-in fade-in">
      <div className={`p-8 rounded-2xl shadow-sm ${t.cardStatic}`}>
        <h2 className={`text-2xl font-bold mb-2 ${t.heading}`}>{message}</h2>
        <p className={`text-sm mb-6 ${t.textMuted}`}>只有白名单内的 QQ 用户才可发布内容与参与互动。<br/>(测试可用白名单: 123456, 888888, 123456789)</p>
        
        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-1 ${t.text}`}>QQ 号</label>
            <input type="text" required value={regQQ} onChange={e=>setRegQQ(e.target.value)} className={`w-full px-4 py-2 rounded-lg ${t.input}`} placeholder="请输入后台授权的 QQ 号"/>
          </div>
          <div>
            <label className={`block text-sm font-medium mb-1 ${t.text}`}>设置昵称</label>
            <input type="text" required value={regName} onChange={e=>setRegName(e.target.value)} className={`w-full px-4 py-2 rounded-lg ${t.input}`} placeholder="您在社区中的显示名称"/>
          </div>
          <Button type="submit" variant="primary" className="w-full mt-4 py-3" disabled={isRegistering}>
            {isRegistering ? '验证并注册中...' : '立即注册'}
          </Button>
        </form>
      </div>
    </div>
  );

  // Theme Management
  const [theme, setTheme] = useState('blue-white');
  const themeStyles = {
    'blue-white': {
      app: 'bg-slate-50 text-slate-900 selection:bg-blue-100 selection:text-blue-900',
      nav: 'bg-white border-b border-slate-200 shadow-sm',
      navLogo: 'text-white bg-blue-600',
      navText: 'text-slate-900',
      navItem: 'text-slate-600 hover:bg-slate-100',
      navItemActive: 'bg-blue-50 text-blue-700',
      navDivider: 'bg-slate-200',
      card: 'bg-white border border-slate-100 shadow-sm hover:shadow-md transition-all',
      cardStatic: 'bg-white border border-slate-100 shadow-sm',
      text: 'text-slate-900',
      textMuted: 'text-slate-500',
      textLight: 'text-slate-400',
      heading: 'text-slate-800',
      primaryBtn: 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm',
      secondaryBtn: 'bg-slate-200 hover:bg-slate-300 text-slate-800',
      outlineBtn: 'border border-blue-600 text-blue-600 hover:bg-blue-50',
      ghostBtn: 'text-slate-600 hover:bg-slate-100',
      dangerBtn: 'bg-red-500 hover:bg-red-600 text-white',
      input: 'bg-slate-50 border-none focus:ring-2 focus:ring-blue-500 text-slate-900',
      iconBg: 'bg-blue-100 text-blue-600',
      accent: 'text-blue-600',
      tag: 'bg-blue-50 text-blue-700 hover:bg-blue-100',
      tagBadge: 'bg-white text-blue-500 group-hover:text-blue-700',
      border: 'border-slate-100',
      borderLight: 'border-slate-50',
      readBg: 'bg-[#f8f9fa]',
      readPaper: 'bg-white border border-slate-200',
      readText: 'text-slate-800',
      commentBg: 'bg-slate-50'
    },
    'dark-gold': {
      app: 'bg-[#121212] text-gray-200 selection:bg-[#d4af37] selection:text-black',
      nav: 'bg-[#1a1a1a] border-b border-[#333] shadow-md',
      navLogo: 'text-black bg-[#d4af37]',
      navText: 'text-[#d4af37]',
      navItem: 'text-gray-400 hover:bg-[#2a2a2a] hover:text-gray-200',
      navItemActive: 'bg-[#2a2410] text-[#d4af37]',
      navDivider: 'bg-[#333]',
      card: 'bg-[#1e1e1e] border border-[#333] shadow-sm hover:shadow-md hover:border-[#444] transition-all',
      cardStatic: 'bg-[#1e1e1e] border border-[#333] shadow-sm',
      text: 'text-gray-100',
      textMuted: 'text-gray-400',
      textLight: 'text-gray-500',
      heading: 'text-gray-100',
      primaryBtn: 'bg-[#d4af37] hover:bg-[#b5952f] text-black shadow-sm font-bold',
      secondaryBtn: 'bg-[#333] hover:bg-[#444] text-gray-200',
      outlineBtn: 'border border-[#d4af37] text-[#d4af37] hover:bg-[#2a2410]',
      ghostBtn: 'text-gray-400 hover:bg-[#2a2a2a] hover:text-gray-200',
      dangerBtn: 'bg-red-900 hover:bg-red-800 text-white',
      input: 'bg-[#2a2a2a] border-none focus:ring-2 focus:ring-[#d4af37] text-gray-100 placeholder-gray-500',
      iconBg: 'bg-[#2a2410] text-[#d4af37]',
      accent: 'text-[#d4af37]',
      tag: 'bg-[#2a2410] text-[#d4af37] hover:bg-[#3d3418]',
      tagBadge: 'bg-[#1a1a1a] text-[#d4af37] group-hover:text-[#f1c40f]',
      border: 'border-[#333]',
      borderLight: 'border-[#222]',
      readBg: 'bg-[#0a0a0a]',
      readPaper: 'bg-[#161616] border border-[#333]',
      readText: 'text-gray-300',
      commentBg: 'bg-[#222]'
    }
  };
  const t = themeStyles[theme];

  // Dynamic Button Component tied to theme
  const Button = ({ children, onClick, variant = 'primary', className = '', disabled = false, icon: Icon, type = "button", title }) => {
    const baseStyle = "px-4 py-2 rounded-md font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed";
    const variants = {
      primary: t.primaryBtn,
      secondary: t.secondaryBtn,
      outline: t.outlineBtn,
      ghost: t.ghostBtn,
      danger: t.dangerBtn
    };
    return (
      <button type={type} onClick={onClick} disabled={disabled} title={title} className={`${baseStyle} ${variants[variant]} ${className}`}>
        {Icon && <Icon size={18} />}
        {children}
      </button>
    );
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Authentication error:", err);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    // Fetch Public Novels
    const novelsRef = collection(db, 'artifacts', appId, 'public', 'data', 'novels');
    const unsubscribeNovels = onSnapshot(novelsRef, (snapshot) => {
      const novelsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort in memory (No complex query rule)
      novelsData.sort((a, b) => b.uploadDate - a.uploadDate);
      setNovels(novelsData);
    }, (error) => {
      console.error("Error fetching novels:", error);
      showToast("获取小说列表失败", "error");
    });

    // Fetch Private User Profile
    const profileRef = doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'data');
    const unsubscribeProfile = onSnapshot(profileRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setUserProfile(data);
        setEditName(data.name); // Ensure edit input is synced when profile loads
      } else {
        // Initialize profile
        const initName = `访客_${user.uid.slice(0, 5)}`;
        setDoc(profileRef, { name: initName, favorites: [], isRegistered: false });
        setEditName(initName);
      }
    }, (error) => {
      console.error("Error fetching profile:", error);
    });

    return () => {
      unsubscribeNovels();
      unsubscribeProfile();
    };
  }, [user]);

  const updateUsername = async (newName) => {
    if (!user || !newName.trim()) return;
    try {
      const profileRef = doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'data');
      await updateDoc(profileRef, { name: newName });
      showToast("昵称更新成功！", "success");
    } catch (err) {
      showToast("更新失败", "error");
    }
  };

  const toggleFavorite = async (novelId) => {
    if (!user) return;
    try {
      const isFav = userProfile.favorites.includes(novelId);
      const newFavs = isFav 
        ? userProfile.favorites.filter(id => id !== novelId)
        : [...userProfile.favorites, novelId];
        
      const profileRef = doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'data');
      await updateDoc(profileRef, { favorites: newFavs });
      showToast(isFav ? "已取消收藏" : "收藏成功！", "success");
    } catch (err) {
      showToast("操作失败", "error");
    }
  };

  const downloadTxt = (novel) => {
    try {
      // Strip HTML tags for clean TXT download if needed, or keep raw. We'll keep raw as it might be pure text.
      const blob = new Blob([novel.content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${novel.title}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast("开始下载...", "success");
    } catch (err) {
      showToast("下载失败", "error");
    }
  };

  const addTag = async (novelId, tagText) => {
    if (!user || !tagText.trim()) return;
    const novel = novels.find(n => n.id === novelId);
    if (!novel) return;

    const existingTagIndex = novel.tags?.findIndex(t => t.text === tagText);
    let newTags = [...(novel.tags || [])];

    if (existingTagIndex >= 0) {
      newTags[existingTagIndex].upvotes += 1;
    } else {
      newTags.push({ text: tagText.trim(), upvotes: 1 });
    }

    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'novels', novelId), { tags: newTags });
      showToast("标签添加成功", "success");
    } catch (err) {
      showToast("添加标签失败", "error");
    }
  };

  const upvoteTag = async (novelId, tagIndex) => {
    if (!user) return;
    const novel = novels.find(n => n.id === novelId);
    if (!novel) return;

    let newTags = [...(novel.tags || [])];
    newTags[tagIndex].upvotes += 1;

    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'novels', novelId), { tags: newTags });
    } catch (err) {
      showToast("点赞失败", "error");
    }
  };

  const addComment = async (novelId, commentText) => {
    if (!userProfile?.isRegistered) {
      showToast("请先前往「个人中心」注册账号后再参与评论！", "error");
      return;
    }
    if (!user || !commentText.trim()) return;
    const novel = novels.find(n => n.id === novelId);
    if (!novel) return;

    const newComment = {
      userId: user.uid,
      userName: userProfile.name,
      text: commentText.trim(),
      date: Date.now()
    };

    let newComments = [...(novel.comments || []), newComment];

    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'novels', novelId), { comments: newComments });
      showToast("评论发布成功", "success");
    } catch (err) {
      showToast("发布评论失败", "error");
    }
  };

  const filteredNovels = useMemo(() => {
    if (!searchQuery) return novels;
    const lowerQ = searchQuery.toLowerCase();
    return novels.filter(n => 
      n.title.toLowerCase().includes(lowerQ) || 
      n.genre.toLowerCase().includes(lowerQ) ||
      (n.tags && n.tags.some(tag => tag.text.toLowerCase().includes(lowerQ)))
    );
  }, [novels, searchQuery]);

  const renderHome = () => (
    <div className="max-w-6xl mx-auto p-6 space-y-8 animate-in fade-in">
      <div className={`flex flex-col md:flex-row justify-between items-center gap-4 p-6 rounded-2xl ${t.cardStatic}`}>
        <div>
          <h1 className={`text-3xl font-bold flex items-center gap-3 ${t.heading}`}>
            <BookOpen className={t.accent} /> 阅文阁
          </h1>
          <p className={`${t.textMuted} mt-2`}>发现、阅读、分享优质小说内容</p>
        </div>
        <div className="relative w-full md:w-96">
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 ${t.textLight}`} size={20} />
          <input 
            type="text" 
            placeholder="搜索书名、分类、标签..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-10 pr-4 py-3 rounded-xl transition-all ${t.input}`}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredNovels.length === 0 ? (
          <div className={`col-span-full py-20 text-center ${t.textMuted}`}>
            <BookOpen size={48} className="mx-auto mb-4 opacity-20" />
            <p>暂无小说，快去上传第一本吧！</p>
          </div>
        ) : (
          filteredNovels.map(novel => (
            <div key={novel.id} className={`${t.card} p-5 flex flex-col h-full group`}>
              <div className="flex justify-between items-start mb-3">
                <span className={`${t.iconBg} text-xs px-2.5 py-1 rounded-full font-medium`}>
                  {novel.genre}
                </span>
                <button 
                  onClick={() => toggleFavorite(novel.id)}
                  className={`${t.textLight} hover:text-red-500 transition-colors`}
                >
                  <Heart size={20} fill={userProfile.favorites.includes(novel.id) ? "currentColor" : "none"} className={userProfile.favorites.includes(novel.id) ? "text-red-500" : ""} />
                </button>
              </div>
              <h3 className={`text-xl font-bold mb-2 line-clamp-1 cursor-pointer transition-colors ${t.text} hover:${t.accent.split(' ')[0]}`} 
                  onClick={() => { setSelectedNovel(novel); setCurrentView('read'); }}>
                {novel.title}
              </h3>
              
              <div className="flex flex-wrap gap-2 mb-4">
                {(novel.tags || []).slice(0, 3).map((tag, i) => (
                  <span key={i} className={`text-xs px-2 py-1 rounded flex items-center gap-1 ${t.secondaryBtn.split(' ')[0]} ${t.textMuted}`}>
                    <Tag size={10} /> {tag.text}
                  </span>
                ))}
              </div>

              <div className={`mt-auto pt-4 border-t flex items-center justify-between text-xs ${t.borderLight} ${t.textMuted}`}>
                <div className="flex items-center gap-1">
                  <User size={14} /> {novel.author || novel.uploaderName}
                </div>
                <div className="flex items-center gap-1">
                  <Clock size={14} /> {new Date(novel.uploadDate).toLocaleDateString()}
                </div>
              </div>
              
              <Button 
                variant="outline" 
                className="w-full mt-4" 
                onClick={() => { setSelectedNovel(novel); setCurrentView('read'); }}
              >
                开始阅读
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );

  const renderReadView = () => {
    if (!selectedNovel) return null;
    const isFav = userProfile.favorites.includes(selectedNovel.id);

    let prevNovel = null;
    let nextNovel = null;
    if (selectedNovel.series) {
      const seriesNovels = novels
        .filter(n => n.series === selectedNovel.series)
        .sort((a, b) => a.uploadDate - b.uploadDate);
      
      const currentIndex = seriesNovels.findIndex(n => n.id === selectedNovel.id);
      if (currentIndex > 0) prevNovel = seriesNovels[currentIndex - 1];
      if (currentIndex < seriesNovels.length - 1) nextNovel = seriesNovels[currentIndex + 1];
    }

    return (
      <div className={`min-h-screen ${t.readBg} pt-4 pb-10`}>
        <div className="max-w-4xl mx-auto p-4 md:p-8 animate-in slide-in-from-bottom-8">
          
          <Button variant="ghost" onClick={() => setCurrentView('home')} className="mb-6 -ml-4">
            <ChevronLeft size={20} /> 返回书架
          </Button>

          <div className={`p-8 md:p-12 rounded-2xl shadow-sm mb-8 ${t.readPaper}`}>
            <div className={`text-center mb-10 pb-8 border-b ${t.border}`}>
              <h1 className={`text-4xl font-black mb-4 tracking-tight ${t.heading}`}>{selectedNovel.title}</h1>
              <div className={`flex flex-wrap items-center justify-center gap-4 text-sm ${t.textMuted}`}>
                <span className="flex items-center gap-1"><User size={16} /> 作者: {selectedNovel.author || selectedNovel.uploaderName}</span>
                {selectedNovel.series && (
                  <span className={`flex items-center gap-1 font-medium px-2 py-0.5 rounded ${t.iconBg}`}>
                    <Layers size={14} /> 系列: {selectedNovel.series}
                  </span>
                )}
                <span className="flex items-center gap-1"><Clock size={16} /> {new Date(selectedNovel.uploadDate).toLocaleString()}</span>
                <span className={`px-3 py-1 rounded-full ${t.secondaryBtn.split(' ')[0]} ${t.text}`}>{selectedNovel.genre}</span>
              </div>
              <div className="mt-6 flex justify-center gap-4">
                <Button variant={isFav ? "primary" : "outline"} onClick={() => toggleFavorite(selectedNovel.id)} icon={Heart}>
                  {isFav ? "已收藏" : "收藏"}
                </Button>
                <Button variant="outline" onClick={() => downloadTxt(selectedNovel)} icon={Download}>
                  下载 TXT
                </Button>
              </div>
            </div>

            {(() => {
              const isHtml = /<(p|div|br|span|h[1-6]|b|i|strong|em)[^>]*>/i.test(selectedNovel.content);
              let displayContent = selectedNovel.content;
              
              if (!isHtml) {
                // 将纯文本依据换行符切割，转为带有缩进的 HTML 段落
                displayContent = selectedNovel.content
                  .split('\n')
                  .map(line => {
                    const trimmed = line.trim();
                    if (!trimmed) return '<div class="h-4"></div>'; // 保留空行间距
                    return `<p style="text-indent: 2em; margin-bottom: 0.5em;">${trimmed}</p>`;
                  })
                  .join('');
              }

              return (
                <div 
                  className={`prose prose-lg max-w-none leading-loose font-serif ${t.readText} prose-p:indent-[2em] ${isHtml ? 'whitespace-pre-wrap' : ''}`}
                  style={{ fontSize: '1.125rem' }}
                  dangerouslySetInnerHTML={{ __html: displayContent }}
                />
              );
            })()}

            {selectedNovel.series && (prevNovel || nextNovel) && (
              <div className={`mt-12 pt-8 border-t flex justify-between items-center gap-4 ${t.border}`}>
                {prevNovel ? (
                  <Button variant="outline" onClick={() => { setSelectedNovel(prevNovel); window.scrollTo({top: 0, behavior: 'smooth'}); }} className="flex-1 max-w-[48%] justify-start overflow-hidden">
                    <ChevronLeft size={18} className="flex-shrink-0" />
                    <span className="truncate">上一篇: {prevNovel.title}</span>
                  </Button>
                ) : <div className="flex-1"></div>}
                
                {nextNovel ? (
                  <Button variant="outline" onClick={() => { setSelectedNovel(nextNovel); window.scrollTo({top: 0, behavior: 'smooth'}); }} className="flex-1 max-w-[48%] justify-end overflow-hidden">
                    <span className="truncate">下一篇: {nextNovel.title}</span>
                    <ChevronRight size={18} className="flex-shrink-0" />
                  </Button>
                ) : <div className="flex-1"></div>}
              </div>
            )}
          </div>

          <div className={`p-6 rounded-2xl shadow-sm mb-8 ${t.cardStatic}`}>
            <h3 className={`text-lg font-bold mb-4 flex items-center gap-2 ${t.heading}`}><Tag className={t.accent} /> 小说标签</h3>
            <div className="flex flex-wrap gap-3 mb-4">
              {(selectedNovel.tags || []).map((tag, idx) => (
                <button 
                  key={idx} 
                  onClick={() => upvoteTag(selectedNovel.id, idx)}
                  className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${t.tag}`}
                >
                  {tag.text} 
                  <span className={`px-1.5 rounded text-xs transition-colors ${t.tagBadge}`}>{tag.upvotes}</span>
                  <ThumbsUp size={12} className="opacity-50 group-hover:opacity-100" />
                </button>
              ))}
            </div>
            <form onSubmit={(e) => { e.preventDefault(); addTag(selectedNovel.id, e.target.tag.value); e.target.reset(); }} className="flex gap-2">
              <input type="text" name="tag" placeholder="添加新标签..." className={`flex-1 px-4 py-2 rounded-lg text-sm ${t.input}`} />
              <Button type="submit" variant="secondary">添加</Button>
            </form>
          </div>

          <div className={`p-6 rounded-2xl shadow-sm ${t.cardStatic}`}>
            <h3 className={`text-lg font-bold mb-6 flex items-center gap-2 ${t.heading}`}><MessageSquare className={t.accent} /> 读者讨论 ({selectedNovel.comments?.length || 0})</h3>
            
            <form onSubmit={(e) => { e.preventDefault(); addComment(selectedNovel.id, e.target.comment.value); e.target.reset(); }} className="mb-8">
              <textarea name="comment" rows="3" placeholder="写下你的读后感..." className={`w-full px-4 py-3 rounded-xl mb-3 resize-none ${t.input}`}></textarea>
              <div className="flex justify-end">
                <Button type="submit" variant="primary">发布评论</Button>
              </div>
            </form>

            <div className="space-y-6">
              {!(selectedNovel.comments?.length) ? (
                <p className={`text-center py-4 ${t.textMuted}`}>还没有评论，来抢个沙发吧！</p>
              ) : (
                selectedNovel.comments.sort((a, b) => b.date - a.date).map((comment, idx) => (
                  <div key={idx} className="flex gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold flex-shrink-0 ${t.iconBg}`}>
                      {comment.userName.charAt(0).toUpperCase()}
                    </div>
                    <div className={`flex-1 p-4 rounded-xl rounded-tl-none ${t.commentBg}`}>
                      <div className="flex justify-between items-center mb-2">
                        <span className={`font-medium text-sm ${t.text}`}>{comment.userName}</span>
                        <span className={`text-xs ${t.textLight}`}>{new Date(comment.date).toLocaleString()}</span>
                      </div>
                      <p className={`whitespace-pre-wrap text-sm leading-relaxed ${t.text}`}>{comment.text}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          
        </div>
      </div>
    );
  };

  const renderUpload = () => {
    if (!userProfile?.isRegistered) {
      return renderRegistrationPrompt("验证 QQ 以解锁发布功能");
    }

    // Effect to auto-fill author when entering upload view
    useEffect(() => {
      if (userProfile?.isRegistered && !uploadAuthor) {
        setUploadAuthor(userProfile.name);
      }
    }, [userProfile, uploadAuthor]);

    const handleFileChange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (file.size > 1048576) { 
        showToast("文件过大！由于环境限制，请上传小于 1MB 的文本文件。", "error");
        return;
      }
      setUploadFileName(file.name);
      
      // Auto fill title with file name without extension
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
      setUploadTitle(nameWithoutExt);
      
      const reader = new FileReader();
      reader.onload = (event) => {
        setUploadFileContent(event.target.result);
      };
      reader.readAsText(file);
    };

    const handleUpload = async (e) => {
      e.preventDefault();
      
      if (!user) {
        showToast("登录状态初始化中，请稍等片刻后重试", "error");
        return;
      }
      
      if (!uploadTitle.trim() || !uploadAuthor.trim() || !uploadFileContent) {
        showToast("请填写完整的标题、作者，并确保文件已正确选择且不为空", "error");
        return;
      }

      setIsUploading(true);
      try {
        const novelsRef = collection(db, 'artifacts', appId, 'public', 'data', 'novels');
        await addDoc(novelsRef, {
          title: uploadTitle.trim(),
          genre: uploadGenre,
          author: uploadAuthor.trim(),
          series: uploadSeries.trim(),
          content: uploadFileContent,
          uploadDate: Date.now(),
          uploaderId: user.uid,
          uploaderName: userProfile.name,
          tags: [],
          comments: []
        });
        showToast("上传成功！", "success");
        setUploadTitle('');
        // We don't reset author so it stays filled for the next upload
        setUploadSeries('');
        setUploadFileName('');
        setUploadFileContent('');
        setCurrentView('home');
      } catch (err) {
        console.error(err);
        showToast("上传失败，可能文件过大或网络异常", "error");
      }
      setIsUploading(false);
    };

    return (
      <div className="max-w-2xl mx-auto p-6 mt-10">
        <div className={`p-8 rounded-2xl animate-in fade-in ${t.cardStatic}`}>
          <div className={`flex items-center gap-3 mb-8 pb-6 border-b ${t.border}`}>
            <div className={`p-3 rounded-full ${t.iconBg}`}>
              <Upload size={24} />
            </div>
            <div>
              <h2 className={`text-2xl font-bold ${t.heading}`}>上传小说文件</h2>
              <p className={`text-sm mt-1 ${t.textMuted}`}>支持 TXT 格式，以及在文本内嵌 HTML 进行高级排版</p>
            </div>
          </div>

          <form onSubmit={handleUpload} className="space-y-6">
            {/* File Upload Component First */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${t.text}`}>TXT 文本文件 (最大 1MB) <span className="text-red-500">*</span></label>
              <label className={`flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${t.border} ${theme === 'dark-gold' ? 'bg-[#222] hover:bg-[#2a2a2a]' : 'bg-gray-50 hover:bg-gray-100'}`}>
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <FileText className={`w-10 h-10 mb-3 ${t.textLight}`} />
                  <p className={`mb-2 text-sm font-medium ${t.textMuted}`}>
                    {uploadFileName ? uploadFileName : "点击或拖拽文件到此处"}
                  </p>
                  {!uploadFileName && <p className={`text-xs ${t.textLight}`}>支持 .txt</p>}
                </div>
                <input type="file" className="hidden" accept=".txt" onChange={handleFileChange} required />
              </label>
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${t.text}`}>小说书名 <span className="text-red-500">*</span></label>
              <input 
                required
                type="text" 
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
                className={`w-full px-4 py-3 rounded-xl ${t.input}`} 
                placeholder="例如：斗破苍穹 (上传文件后自动填入)"
              />
            </div>
            
            <div>
              <label className={`block text-sm font-medium mb-2 ${t.text}`}>小说类型</label>
              <select 
                value={uploadGenre}
                onChange={(e) => setUploadGenre(e.target.value)}
                className={`w-full px-4 py-3 rounded-xl ${t.input}`}
              >
                <option>杂谈</option>
                <option>短篇</option>
                <option>连载</option>
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className={`block text-sm font-medium mb-2 ${t.text}`}>作者 <span className="text-red-500">*</span></label>
                <input 
                  required
                  type="text" 
                  value={uploadAuthor}
                  onChange={(e) => setUploadAuthor(e.target.value)}
                  className={`w-full px-4 py-3 rounded-xl ${t.input}`} 
                  placeholder="文章/小说的原作者"
                />
              </div>
              
              <div>
                <label className={`block text-sm font-medium mb-2 ${t.text}`}>所属系列 (可选)</label>
                <input 
                  type="text" 
                  value={uploadSeries}
                  onChange={(e) => setUploadSeries(e.target.value)}
                  className={`w-full px-4 py-3 rounded-xl ${t.input}`} 
                  placeholder="相同系列的会自动生成上下篇跳转"
                />
              </div>
            </div>

            <Button type="submit" variant="primary" className="w-full py-3 text-lg mt-4" disabled={isUploading}>
              {isUploading ? "正在上传..." : "确认发布"}
            </Button>
          </form>
        </div>
      </div>
    );
  };

  const renderProfile = () => {
    if (!userProfile?.isRegistered) {
      return renderRegistrationPrompt("验证 QQ 注册完整账号");
    }

    const myFavNovels = novels.filter(n => userProfile.favorites.includes(n.id));

    return (
      <div className="max-w-4xl mx-auto p-6 mt-10 animate-in fade-in">
        <div className={`p-8 rounded-2xl mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 ${t.cardStatic}`}>
          <div className="flex items-center gap-4">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center font-bold text-3xl ${t.iconBg}`}>
              {userProfile.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className={`text-2xl font-bold ${t.heading}`}>个人中心</h2>
              <p className={`text-sm mt-1 ${t.textMuted}`}>你的身份标识用于发布小说和发表评论。</p>
            </div>
          </div>
          
          <div className="flex w-full md:w-auto gap-2">
            <input 
              type="text" 
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className={`px-4 py-2 rounded-lg w-full md:w-48 text-sm ${t.input}`}
              placeholder="修改昵称"
            />
            <Button onClick={() => updateUsername(editName)} variant="secondary">
              保存
            </Button>
          </div>
        </div>

        <h3 className={`text-xl font-bold mb-6 flex items-center gap-2 ${t.heading}`}><Heart className="text-red-500" /> 我的书架 (收藏)</h3>
        
        {myFavNovels.length === 0 ? (
          <div className={`text-center py-16 rounded-2xl border border-dashed ${theme === 'dark-gold' ? 'border-[#444] bg-[#1a1a1a]' : 'border-gray-200 bg-white'}`}>
            <Heart size={48} className={`mx-auto mb-4 ${t.textLight}`} />
            <p className={t.textMuted}>你还没有收藏任何小说哦</p>
            <Button variant="outline" className="mt-4 mx-auto" onClick={() => setCurrentView('home')}>
              去发现好书
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {myFavNovels.map(novel => (
              <div key={novel.id} className={`p-4 rounded-xl flex justify-between items-center ${t.card}`}>
                <div 
                  className="cursor-pointer flex-1"
                  onClick={() => { setSelectedNovel(novel); setCurrentView('read'); }}
                >
                  <h4 className={`font-bold transition-colors line-clamp-1 ${t.text} hover:${t.accent.split(' ')[0]}`}>{novel.title}</h4>
                  <p className={`text-xs mt-1 ${t.textMuted}`}>{novel.genre} • 作者: {novel.author || novel.uploaderName}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" className="!p-2" onClick={() => downloadTxt(novel)} title="下载">
                    <Download size={18} className={t.textMuted} />
                  </Button>
                  <Button variant="ghost" className={`!p-2 hover:${t.dangerBtn.split(' ')[0]} bg-opacity-10`} onClick={() => toggleFavorite(novel.id)} title="取消收藏">
                    <Heart size={18} className="text-red-500" fill="currentColor" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`min-h-screen font-sans transition-colors duration-200 ${t.app}`}>
      {/* Navigation Bar */}
      <nav className={`sticky top-0 z-40 transition-colors duration-200 ${t.nav}`}>
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => setCurrentView('home')}>
              <div className={`p-2 rounded-lg ${t.navLogo}`}>
                <BookOpen size={20} />
              </div>
              <span className={`font-extrabold text-xl tracking-tight ${t.navText}`}>小说文库</span>
            </div>
            
            <div className="flex items-center gap-1 md:gap-4">
              {/* Theme Switcher Button */}
              <button 
                onClick={() => setTheme(theme === 'blue-white' ? 'dark-gold' : 'blue-white')}
                className={`p-2 rounded-lg font-medium text-sm transition-colors ${t.navItem}`}
                title="切换主题"
              >
                {theme === 'blue-white' ? '🌙' : '☀️'}
              </button>
              <div className={`w-px h-6 mx-1 md:mx-2 ${t.navDivider}`}></div>
              
              <button 
                onClick={() => setCurrentView('home')}
                className={`p-2 md:px-4 md:py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 ${currentView === 'home' || currentView === 'read' ? t.navItemActive : t.navItem}`}
              >
                <Home size={18} /> <span className="hidden md:inline">首页</span>
              </button>
              <button 
                onClick={() => setCurrentView('upload')}
                className={`p-2 md:px-4 md:py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 ${currentView === 'upload' ? t.navItemActive : t.navItem}`}
              >
                <Upload size={18} /> <span className="hidden md:inline">发布</span>
              </button>
              <div className={`w-px h-6 mx-1 md:mx-2 ${t.navDivider}`}></div>
              <button 
                onClick={() => setCurrentView('profile')}
                className={`p-2 md:px-4 md:py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 ${currentView === 'profile' ? t.navItemActive : t.navItem}`}
              >
                <User size={18} /> <span className="hidden md:inline">{userProfile.name}</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="pb-20">
        {currentView === 'home' && renderHome()}
        {currentView === 'upload' && renderUpload()}
        {currentView === 'profile' && renderProfile()}
        {currentView === 'read' && renderReadView()}
      </main>

      {/* Toast Notification */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}