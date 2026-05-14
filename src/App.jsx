import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, onSnapshot, addDoc, updateDoc, getDoc, increment } from 'firebase/firestore';
import { BookOpen, Upload, Home, User, Heart, Download, Tag, MessageSquare, ThumbsUp, ChevronLeft, ChevronRight, Search, Clock, FileText, Layers, Filter, LogOut, LogIn, AlignLeft, Edit } from 'lucide-react'; // 新增了 Edit 图标

const firebaseConfig = {
  apiKey: "AIzaSyBI1J-bYvb-wE6nu1vFJ_oQzN9CWQGicDo",
  authDomain: "yusu-qcym.firebaseapp.com",
  projectId: "yusu-qcym",
  storageBucket: "yusu-qcym.firebasestorage.app",
  messagingSenderId: "682459976717",
  appId: "1:682459976717:web:74aac64bb6f60a72523144",
  measurementId: "G-ELNB3TS8ND"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'novel-app-default'; 

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
  const [userProfile, setUserProfile] = useState({ name: '访客', favorites: [] });
  const [novels, setNovels] = useState([]);
  
  // Navigation & View State
  const [currentView, setCurrentView] = useState('home'); 
  const [selectedNovel, setSelectedNovel] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Advanced Filters State
  const [sortBy, setSortBy] = useState('time'); 
  const [filterIncludeTag, setFilterIncludeTag] = useState('');
  const [filterExcludeTag, setFilterExcludeTag] = useState('');
  const [minWords, setMinWords] = useState('');
  const [maxWords, setMaxWords] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  // UI State
  const [toast, setToast] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  // Upload / Edit Form State
  const [editingNovelId, setEditingNovelId] = useState(null); // 新增：用于判断是否在编辑已有小说
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadGenre, setUploadGenre] = useState('短篇');
  const [uploadAuthor, setUploadAuthor] = useState('');
  const [uploadSeries, setUploadSeries] = useState('');
  const [uploadSynopsis, setUploadSynopsis] = useState('');
  const [uploadFileContent, setUploadFileContent] = useState('');
  const [uploadFileName, setUploadFileName] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Profile Edit State
  const [editName, setEditName] = useState('');

  // Auth State
  const [authMode, setAuthMode] = useState('login'); 
  const [authQQ, setAuthQQ] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const showToast = (message, type = 'info') => setToast({ message, type });

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
      input: 'bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-blue-500 text-slate-900',
      iconBg: 'bg-blue-100 text-blue-600',
      accent: 'text-blue-600',
      tag: 'bg-blue-50 text-blue-700 hover:bg-blue-100',
      tagBadge: 'bg-white text-blue-500 group-hover:text-blue-700',
      border: 'border-slate-100',
      borderLight: 'border-slate-50',
      readBg: 'bg-[#f8f9fa]',
      readPaper: 'bg-white border border-slate-200',
      readText: 'text-slate-800',
      commentBg: 'bg-slate-50',
      synopsisBg: 'bg-blue-50 border-l-4 border-blue-500 text-slate-800'
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
      input: 'bg-[#2a2a2a] border border-[#444] focus:ring-2 focus:ring-[#d4af37] text-gray-100 placeholder-gray-500',
      iconBg: 'bg-[#2a2410] text-[#d4af37]',
      accent: 'text-[#d4af37]',
      tag: 'bg-[#2a2410] text-[#d4af37] hover:bg-[#3d3418]',
      tagBadge: 'bg-[#1a1a1a] text-[#d4af37] group-hover:text-[#f1c40f]',
      border: 'border-[#333]',
      borderLight: 'border-[#222]',
      readBg: 'bg-[#0a0a0a]',
      readPaper: 'bg-[#161616] border border-[#333]',
      readText: 'text-gray-300',
      commentBg: 'bg-[#222]',
      synopsisBg: 'bg-[#1e1a0f] border-l-4 border-[#d4af37] text-gray-300'
    }
  };
  const t = themeStyles[theme];

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
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setUserProfile({ name: '访客', favorites: [], isRegistered: false });
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const novelsRef = collection(db, 'artifacts', appId, 'public', 'data', 'novels');
    const unsubscribeNovels = onSnapshot(novelsRef, (snapshot) => {
      const novelsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setNovels(novelsData);
    }, (error) => {
      console.error("Error fetching novels:", error);
    });

    let unsubscribeProfile = () => {};
    if (user) {
      const profileRef = doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'data');
      unsubscribeProfile = onSnapshot(profileRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setUserProfile(data);
          setEditName(data.name);
        }
      });
    }

    return () => {
      unsubscribeNovels();
      unsubscribeProfile();
    };
  }, [user]);

  const getDummyEmail = (qq) => `${qq}@qcym.library.local`;

  const handleAuth = async (e) => {
    e.preventDefault();
    const qq = authQQ.trim();
    const pwd = authPassword.trim();
    const name = authName.trim();

    if (!qq || !pwd) {
      showToast("请输入QQ号和密码！", "error");
      return;
    }

    setIsAuthenticating(true);
    try {
      if (authMode === 'register') {
        if (!name) throw new Error("请输入昵称");
        
        const whitelistRef = doc(db, 'artifacts', appId, 'whitelist', 'data', 'allowed_qqs', qq);
        const whitelistSnap = await getDoc(whitelistRef);
        if (!whitelistSnap.exists()) {
          throw new Error("该QQ号不在系统白名单中，请联系管理员！");
        }

        const qqRef = doc(db, 'artifacts', appId, 'public', 'data', 'registered_qqs', qq);
        const qqSnap = await getDoc(qqRef);
        if (qqSnap.exists()) {
          throw new Error("该QQ号已被注册，请直接登录！");
        }

        const userCred = await createUserWithEmailAndPassword(auth, getDummyEmail(qq), pwd);
        
        await setDoc(qqRef, { uid: userCred.user.uid, timestamp: Date.now() });
        const profileRef = doc(db, 'artifacts', appId, 'users', userCred.user.uid, 'profile', 'data');
        await setDoc(profileRef, { 
          qq: qq,
          name: name,
          favorites: [],
          isRegistered: true 
        });
        showToast("注册成功，欢迎加入！", "success");
        setCurrentView('home');

      } else {
        await signInWithEmailAndPassword(auth, getDummyEmail(qq), pwd);
        showToast("登录成功！", "success");
        setCurrentView('home');
      }
    } catch (err) {
      console.error(err);
      if (err.message.includes('不在系统白名单')) showToast(err.message, "error");
      else if (err.code === 'auth/email-already-in-use') showToast("该账号已被注册", "error");
      else if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') showToast("账号或密码错误", "error");
      else showToast(err.message || "操作失败，请检查网络", "error");
    }
    setIsAuthenticating(false);
  };

  const handleLogout = () => {
    signOut(auth);
    showToast("已退出登录", "success");
    setCurrentView('home');
  };

  // 重置发书表单
  const resetUploadForm = () => {
    setEditingNovelId(null);
    setUploadTitle('');
    setUploadGenre('短篇');
    setUploadSeries('');
    setUploadSynopsis('');
    setUploadFileContent('');
    setUploadFileName('');
    if (userProfile?.isRegistered && !uploadAuthor) {
      setUploadAuthor(userProfile.name);
    }
  };

  // 跳转到编辑页面
  const openEditView = (novel) => {
    setEditingNovelId(novel.id);
    setUploadTitle(novel.title);
    setUploadGenre(novel.genre || '短篇');
    setUploadAuthor(novel.author || userProfile.name);
    setUploadSeries(novel.series || '');
    setUploadSynopsis(novel.synopsis || '');
    setUploadFileContent(novel.content);
    setUploadFileName(''); 
    setCurrentView('upload'); 
  };

  useEffect(() => {
    if (currentView === 'upload' && userProfile?.isRegistered && !uploadAuthor && !editingNovelId) {
      setUploadAuthor(userProfile.name);
    }
  }, [currentView, userProfile, uploadAuthor, editingNovelId]);

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
    if (!user || !userProfile.isRegistered) {
      showToast("请先登录账号", "error");
      setCurrentView('auth');
      return;
    }
    try {
      const isFav = userProfile.favorites?.includes(novelId);
      const newFavs = isFav 
        ? userProfile.favorites.filter(id => id !== novelId)
        : [...(userProfile.favorites || []), novelId];
        
      const profileRef = doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'data');
      await updateDoc(profileRef, { favorites: newFavs });

      const novelRef = doc(db, 'artifacts', appId, 'public', 'data', 'novels', novelId);
      await updateDoc(novelRef, { favoritesCount: increment(isFav ? -1 : 1) });

      showToast(isFav ? "已取消收藏" : "收藏成功！", "success");
    } catch (err) {
      console.error(err);
      showToast("操作失败", "error");
    }
  };

  const downloadTxt = (novel) => {
    try {
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
    if (!user || !userProfile.isRegistered) return;
    if (!tagText.trim()) return;
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
    if (!user || !userProfile.isRegistered) return;
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
      showToast("请先登录账号后再参与评论！", "error");
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

  const processedNovels = useMemo(() => {
    let result = [...novels];

    if (searchQuery) {
      const lowerQ = searchQuery.toLowerCase();
      result = result.filter(n => 
        n.title.toLowerCase().includes(lowerQ) || 
        n.genre.toLowerCase().includes(lowerQ) ||
        (n.tags && n.tags.some(tag => tag.text.toLowerCase().includes(lowerQ))) ||
        (n.synopsis && n.synopsis.toLowerCase().includes(lowerQ))
      );
    }

    if (filterIncludeTag.trim()) {
      const inc = filterIncludeTag.trim().toLowerCase();
      result = result.filter(n => n.tags?.some(t => t.text.toLowerCase().includes(inc)));
    }
    if (filterExcludeTag.trim()) {
      const exc = filterExcludeTag.trim().toLowerCase();
      result = result.filter(n => !n.tags?.some(t => t.text.toLowerCase().includes(exc)));
    }

    if (minWords) {
      result = result.filter(n => (n.content?.length || 0) >= parseInt(minWords));
    }
    if (maxWords) {
      result = result.filter(n => (n.content?.length || 0) <= parseInt(maxWords));
    }

    result.sort((a, b) => {
      if (sortBy === 'comments') {
        return (b.comments?.length || 0) - (a.comments?.length || 0);
      }
      if (sortBy === 'favorites') {
        return (b.favoritesCount || 0) - (a.favoritesCount || 0);
      }
      return b.uploadDate - a.uploadDate;
    });

    return result;
  }, [novels, searchQuery, filterIncludeTag, filterExcludeTag, minWords, maxWords, sortBy]);

  const paginatedNovels = processedNovels.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  const totalPages = Math.max(1, Math.ceil(processedNovels.length / ITEMS_PER_PAGE));

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterIncludeTag, filterExcludeTag, minWords, maxWords, sortBy]);


  const renderAuth = () => (
    <div className="max-w-md mx-auto p-6 mt-20 animate-in fade-in">
      <div className={`p-8 rounded-2xl shadow-sm ${t.cardStatic}`}>
        <h2 className={`text-2xl font-bold mb-2 ${t.heading}`}>
          {authMode === 'login' ? '账号登录' : '登记与注册'}
        </h2>
        <p className={`text-sm mb-6 ${t.textMuted}`}>
          {authMode === 'login' 
            ? '欢迎回到青鸟学会图书馆。' 
            : '只有白名单内的用户才可注册。请联系管理员登记。'}
        </p>
        
        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-1 ${t.text}`}>QQ 号</label>
            <input type="text" required value={authQQ} onChange={e=>setAuthQQ(e.target.value)} className={`w-full px-4 py-2 rounded-lg ${t.input}`} placeholder="请输入 QQ 号"/>
          </div>
          
          {authMode === 'register' && (
            <div>
              <label className={`block text-sm font-medium mb-1 ${t.text}`}>社区昵称</label>
              <input type="text" required value={authName} onChange={e=>setAuthName(e.target.value)} className={`w-full px-4 py-2 rounded-lg ${t.input}`} placeholder="您在社区中的显示名称"/>
            </div>
          )}

          <div>
            <label className={`block text-sm font-medium mb-1 ${t.text}`}>密码</label>
            <input type="password" required value={authPassword} onChange={e=>setAuthPassword(e.target.value)} className={`w-full px-4 py-2 rounded-lg ${t.input}`} placeholder="请输入密码"/>
          </div>

          <Button type="submit" variant="primary" className="w-full mt-4 py-3" disabled={isAuthenticating}>
            {isAuthenticating ? '处理中...' : (authMode === 'login' ? '登录' : '确认注册')}
          </Button>
        </form>

        <div className={`mt-6 pt-4 border-t text-center text-sm ${t.border}`}>
          <span className={t.textMuted}>
            {authMode === 'login' ? '还没有账号？' : '已有账号？'}
          </span>
          <button 
            type="button"
            onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
            className={`ml-2 font-bold ${t.accent} hover:underline`}
          >
            {authMode === 'login' ? '申请注册' : '直接登录'}
          </button>
        </div>
      </div>
    </div>
  );

  const renderHome = () => (
    <div className="max-w-6xl mx-auto p-6 space-y-6 animate-in fade-in">
      <div className={`flex flex-col md:flex-row justify-between items-center gap-4 p-6 rounded-2xl ${t.cardStatic}`}>
        <div>
          <h1 className={`text-3xl font-bold flex items-center gap-3 ${t.heading}`}>
            <BookOpen className={t.accent} /> 真羽叙事
          </h1>
          <p className={`${t.textMuted} mt-2`}>思想，记叙，表述。</p>
        </div>
        <div className="w-full md:w-auto flex-1 max-w-lg flex gap-2">
          <div className="relative w-full">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 ${t.textLight}`} size={20} />
            <input 
              type="text" 
              placeholder="搜索书名、简介、标签……" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-10 pr-4 py-3 rounded-xl transition-all ${t.input}`}
            />
          </div>
          <Button variant="outline" onClick={() => setShowFilters(!showFilters)} className="px-4" title="高级过滤">
            <Filter size={20} />
          </Button>
        </div>
      </div>

      {showFilters && (
        <div className={`p-5 rounded-xl flex flex-wrap gap-4 items-end animate-in slide-in-from-top-2 ${t.cardStatic} text-sm`}>
          <div>
            <label className={`block mb-1 font-medium ${t.textMuted}`}>排序方式</label>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className={`px-3 py-2 rounded-lg ${t.input}`}>
              <option value="time">最新上传</option>
              <option value="favorites">收藏最多</option>
              <option value="comments">评论最多</option>
            </select>
          </div>
          <div>
            <label className={`block mb-1 font-medium ${t.textMuted}`}>包含标签</label>
            <input type="text" placeholder="如: 训诫" value={filterIncludeTag} onChange={e => setFilterIncludeTag(e.target.value)} className={`w-28 px-3 py-2 rounded-lg ${t.input}`} />
          </div>
          <div>
            <label className={`block mb-1 font-medium ${t.textMuted}`}>排除标签</label>
            <input type="text" placeholder="如: 清水" value={filterExcludeTag} onChange={e => setFilterExcludeTag(e.target.value)} className={`w-28 px-3 py-2 rounded-lg ${t.input}`} />
          </div>
          <div className="flex items-end gap-2">
            <div>
              <label className={`block mb-1 font-medium ${t.textMuted}`}>字数 (最小值)</label>
              <input type="number" placeholder="0" value={minWords} onChange={e => setMinWords(e.target.value)} className={`w-24 px-3 py-2 rounded-lg ${t.input}`} />
            </div>
            <span className={`mb-2 ${t.textMuted}`}>-</span>
            <div>
              <label className={`block mb-1 font-medium ${t.textMuted}`}>字数 (最大值)</label>
              <input type="number" placeholder="无限制" value={maxWords} onChange={e => setMaxWords(e.target.value)} className={`w-24 px-3 py-2 rounded-lg ${t.input}`} />
            </div>
          </div>
          <Button variant="ghost" onClick={() => { setFilterIncludeTag(''); setFilterExcludeTag(''); setMinWords(''); setMaxWords(''); setSortBy('time'); }} className="ml-auto">
            重置
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {paginatedNovels.length === 0 ? (
          <div className={`col-span-full py-20 text-center ${t.textMuted}`}>
            <BookOpen size={48} className="mx-auto mb-4 opacity-20" />
            <p>没有找到符合条件的内容</p>
          </div>
        ) : (
          paginatedNovels.map(novel => {
            const topTags = [...(novel.tags || [])].sort((a, b) => b.upvotes - a.upvotes).slice(0, 3);
            const wordCount = novel.content?.length || 0;

            return (
              <div key={novel.id} className={`${t.card} p-5 flex flex-col h-full group`}>
                <div className="flex justify-between items-start mb-3">
                  <span className={`${t.iconBg} text-xs px-2.5 py-1 rounded-full font-medium`}>
                    {novel.genre}
                  </span>
                  <button 
                    onClick={() => toggleFavorite(novel.id)}
                    className={`${t.textLight} hover:text-red-500 transition-colors flex items-center gap-1`}
                  >
                    <Heart size={20} fill={userProfile.favorites?.includes(novel.id) ? "currentColor" : "none"} className={userProfile.favorites?.includes(novel.id) ? "text-red-500" : ""} />
                  </button>
                </div>
                
                <h3 className={`text-xl font-bold mb-2 line-clamp-1 cursor-pointer transition-colors ${t.text} hover:${t.accent.split(' ')[0]}`} 
                    onClick={() => { setSelectedNovel(novel); setCurrentView('read'); }}>
                  {novel.title}
                </h3>

                {novel.synopsis && (
                  <p className={`text-sm mb-3 line-clamp-2 ${t.textMuted}`}>
                    {novel.synopsis}
                  </p>
                )}
                
                <div className={`flex flex-wrap gap-x-3 gap-y-1 mb-3 text-xs ${t.textMuted}`}>
                  <span className="flex items-center gap-1" title="字数"><FileText size={12} /> {wordCount} 字</span>
                  <span className="flex items-center gap-1" title="收藏数"><Heart size={12} /> {novel.favoritesCount || 0} 收藏</span>
                  <span className="flex items-center gap-1" title="评论数"><MessageSquare size={12} /> {novel.comments?.length || 0} 评论</span>
                </div>
                
                <div className="flex flex-wrap gap-2 mb-4 h-6 overflow-hidden">
                  {topTags.map((tag, i) => (
                    <span key={i} className={`text-xs px-2 py-0.5 rounded flex items-center gap-1 ${t.secondaryBtn.split(' ')[0]} ${t.textMuted}`}>
                      <Tag size={10} /> {tag.text}
                    </span>
                  ))}
                  {topTags.length === 0 && <span className={`text-xs italic ${t.textLight}`}>暂无标签</span>}
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
            );
          })
        )}
      </div>

      {totalPages > 1 && (
        <div className={`flex justify-center items-center gap-4 py-6 ${t.textMuted}`}>
          <Button variant="ghost" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>
            <ChevronLeft size={20} />
          </Button>
          <span className="font-medium text-sm">第 {currentPage} / {totalPages} 页</span>
          <Button variant="ghost" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>
            <ChevronRight size={20} />
          </Button>
        </div>
      )}
    </div>
  );

  const renderReadView = () => {
    if (!selectedNovel) return null;
    const isFav = userProfile.favorites?.includes(selectedNovel.id);

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

            {selectedNovel.synopsis && (
              <div className={`mb-10 p-6 rounded-xl ${t.synopsisBg}`}>
                <h4 className="font-bold mb-2 flex items-center gap-2"><AlignLeft size={16}/> 内容简介</h4>
                <p className="text-[0.95rem] leading-relaxed whitespace-pre-wrap">{selectedNovel.synopsis}</p>
              </div>
            )}

            {(() => {
              const isHtml = /<(p|div|br|span|h[1-6]|b|i|strong|em)[^>]*>/i.test(selectedNovel.content);
              let displayContent = selectedNovel.content;
              
              if (!isHtml) {
                displayContent = selectedNovel.content
                  .split('\n')
                  .map(line => {
                    const trimmed = line.trim();
                    if (!trimmed) return '<div class="h-4"></div>'; 
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
    if (!user || !userProfile?.isRegistered) {
      setCurrentView('auth');
      return null;
    }

    const handleFileChange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (file.size > 1048576) { 
        showToast("文件过大！请上传小于 1MB 的文本文件。", "error");
        return;
      }
      setUploadFileName(file.name);
      
      // 只有在非编辑状态，才去覆盖标题
      if (!editingNovelId) {
        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
        setUploadTitle(nameWithoutExt);
      }
      
      const reader = new FileReader();
      reader.onload = (event) => {
        setUploadFileContent(event.target.result);
        showToast("文件读取成功，你可以在下方框内继续编辑排版", "success");
      };
      reader.readAsText(file);
    };

    const handleUpload = async (e) => {
      e.preventDefault();
      
      if (!uploadTitle.trim() || !uploadAuthor.trim() || !uploadFileContent.trim()) {
        showToast("请填写完整的标题、作者及正文内容", "error");
        return;
      }

      setIsUploading(true);
      try {
        const novelsRef = collection(db, 'artifacts', appId, 'public', 'data', 'novels');
        
        if (editingNovelId) {
          // 编辑模式：更新现有文档
          const novelDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'novels', editingNovelId);
          await updateDoc(novelDocRef, {
            title: uploadTitle.trim(),
            genre: uploadGenre,
            author: uploadAuthor.trim(),
            series: uploadSeries.trim(),
            synopsis: uploadSynopsis.trim(),
            content: uploadFileContent
            // tags, comments, uploadDate 保持原样不覆盖
          });
          showToast("作品修改保存成功！", "success");
          setCurrentView('profile'); // 编辑完成后退回个人中心
        } else {
          // 发布模式：创建新文档
          await addDoc(novelsRef, {
            title: uploadTitle.trim(),
            genre: uploadGenre,
            author: uploadAuthor.trim(),
            series: uploadSeries.trim(),
            synopsis: uploadSynopsis.trim(),
            content: uploadFileContent,
            uploadDate: Date.now(),
            uploaderId: user.uid,
            uploaderName: userProfile.name,
            favoritesCount: 0, 
            tags: [],
            comments: []
          });
          showToast("上传发布成功！", "success");
          setCurrentView('home'); // 发布完成后去首页
        }
        
        resetUploadForm();

      } catch (err) {
        console.error(err);
        showToast(editingNovelId ? "修改失败，请检查网络" : "上传失败，请检查网络异常", "error");
      }
      setIsUploading(false);
    };

    return (
      <div className="max-w-4xl mx-auto p-6 mt-6">
        <div className={`p-8 rounded-2xl animate-in fade-in ${t.cardStatic}`}>
          <div className={`flex items-center gap-3 mb-8 pb-6 border-b ${t.border}`}>
            <div className={`p-3 rounded-full ${t.iconBg}`}>
              {editingNovelId ? <Edit size={24} /> : <Upload size={24} />}
            </div>
            <div>
              <h2 className={`text-2xl font-bold ${t.heading}`}>
                {editingNovelId ? "编辑作品" : "发布作品"}
              </h2>
              <p className={`text-sm mt-1 ${t.textMuted}`}>
                {editingNovelId ? "修改你已经上传的作品信息与正文内容" : "你可以直接复制文本撰写，也可以上传 TXT 文件后二次排版编辑"}
              </p>
            </div>
          </div>

          <form onSubmit={handleUpload} className="space-y-6">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className={`block text-sm font-medium mb-2 ${t.text}`}>作品书名 <span className="text-red-500">*</span></label>
                <input 
                  required
                  type="text" 
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  className={`w-full px-4 py-3 rounded-xl ${t.input}`} 
                  placeholder="请输入作品名称"
                />
              </div>
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
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className={`block text-sm font-medium mb-2 ${t.text}`}>作品类型</label>
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
              <div>
                <label className={`block text-sm font-medium mb-2 ${t.text}`}>所属系列 (可选)</label>
                <input 
                  type="text" 
                  value={uploadSeries}
                  onChange={(e) => setUploadSeries(e.target.value)}
                  className={`w-full px-4 py-3 rounded-xl ${t.input}`} 
                  placeholder="同系列作品会自动生成上下篇跳转"
                />
              </div>
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${t.text}`}>内容简介 (最多 500 字)</label>
              <textarea 
                maxLength={500}
                value={uploadSynopsis}
                onChange={(e) => setUploadSynopsis(e.target.value)}
                className={`w-full px-4 py-3 rounded-xl resize-none mb-1 ${t.input}`} 
                rows="3"
                placeholder="简明扼要地介绍一下这部作品的情节、背景或亮点..."
              ></textarea>
              <div className={`text-right text-xs ${t.textLight}`}>
                {uploadSynopsis.length} / 500
              </div>
            </div>

            <div className={`p-5 rounded-xl border ${t.border} ${theme === 'dark-gold' ? 'bg-[#1a1a1a]' : 'bg-slate-50/50'}`}>
              <div className="mb-6">
                <label className={`block text-sm font-medium mb-2 ${t.text}`}>一键导入 TXT (可选)</label>
                <label className={`flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${t.border} ${theme === 'dark-gold' ? 'bg-[#222] hover:bg-[#2a2a2a]' : 'bg-white hover:bg-gray-50'}`}>
                  <div className="flex flex-col items-center justify-center">
                    <p className={`mb-1 text-sm font-medium ${t.textMuted}`}>
                      {uploadFileName ? `已选择：${uploadFileName} (点此可重新选择)` : "点击或拖拽 TXT 文件到此处覆盖内容"}
                    </p>
                    {!uploadFileName && <p className={`text-xs ${t.textLight}`}>上传后内容会自动填入下方输入框</p>}
                  </div>
                  <input type="file" className="hidden" accept=".txt" onChange={handleFileChange} />
                </label>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${t.text}`}>正文内容 <span className="text-red-500">*</span></label>
                <textarea 
                  required
                  value={uploadFileContent}
                  onChange={(e) => setUploadFileContent(e.target.value)}
                  className={`w-full px-4 py-3 rounded-xl resize-y min-h-[350px] font-serif leading-relaxed ${t.input}`} 
                  placeholder="你可以选择上面的按钮导入TXT，或者直接在此处粘贴/编写正文内容...&#10;&#10;支持在文本内嵌基本的 HTML 标签（如 <b>加粗</b> 等）来进行高级排版。"
                ></textarea>
              </div>
            </div>

            <Button type="submit" variant="primary" className="w-full py-4 text-lg mt-4 font-bold" disabled={isUploading}>
              {isUploading ? (editingNovelId ? "正在保存..." : "正在发布至书架...") : (editingNovelId ? "保存修改" : "确认发布")}
            </Button>
          </form>
        </div>
      </div>
    );
  };

  const renderProfile = () => {
    if (!user || !userProfile?.isRegistered) {
      setCurrentView('auth');
      return null;
    }

    const myFavNovels = novels.filter(n => userProfile.favorites?.includes(n.id));
    const myUploads = novels.filter(n => n.uploaderId === user.uid); // 新增：筛选出当前用户的上传

    return (
      <div className="max-w-4xl mx-auto p-6 mt-10 animate-in fade-in space-y-12">
        {/* Profile Info Header */}
        <div className={`p-8 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 ${t.cardStatic}`}>
          <div className="flex items-center gap-4">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center font-bold text-3xl ${t.iconBg}`}>
              {userProfile.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className={`text-2xl font-bold ${t.heading}`}>个人中心</h2>
              <p className={`text-sm mt-1 ${t.textMuted}`}>当前绑定 QQ：{userProfile.qq}</p>
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

        {/* --- Block 1: 我的书架 --- */}
        <div>
          <h3 className={`text-xl font-bold mb-6 flex items-center gap-2 ${t.heading}`}><Heart className="text-red-500" /> 我的书架 (收藏)</h3>
          
          {myFavNovels.length === 0 ? (
            <div className={`text-center py-12 rounded-2xl border border-dashed ${theme === 'dark-gold' ? 'border-[#444] bg-[#1a1a1a]' : 'border-gray-200 bg-white'}`}>
              <Heart size={40} className={`mx-auto mb-3 ${t.textLight}`} />
              <p className={t.textMuted}>当前你并没有收藏任何小说。</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myFavNovels.map(novel => (
                <div key={novel.id} className={`p-4 rounded-xl flex justify-between items-center ${t.card}`}>
                  <div 
                    className="cursor-pointer flex-1 pr-4"
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

        {/* --- Block 2: 我的上传 --- */}
        <div>
          <h3 className={`text-xl font-bold mb-6 flex items-center gap-2 ${t.heading}`}><Upload className={t.accent} /> 我的上传</h3>
          
          {myUploads.length === 0 ? (
            <div className={`text-center py-12 rounded-2xl border border-dashed ${theme === 'dark-gold' ? 'border-[#444] bg-[#1a1a1a]' : 'border-gray-200 bg-white'}`}>
              <Upload size={40} className={`mx-auto mb-3 ${t.textLight}`} />
              <p className={t.textMuted}>你还没有发布过任何作品。</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myUploads.sort((a, b) => b.uploadDate - a.uploadDate).map(novel => (
                <div key={novel.id} className={`p-4 rounded-xl flex justify-between items-center ${t.card}`}>
                  <div 
                    className="cursor-pointer flex-1 pr-4"
                    onClick={() => { setSelectedNovel(novel); setCurrentView('read'); }}
                  >
                    <h4 className={`font-bold transition-colors line-clamp-1 ${t.text} hover:${t.accent.split(' ')[0]}`}>{novel.title}</h4>
                    <p className={`text-xs mt-1.5 flex gap-3 ${t.textMuted}`}>
                      <span>字数: {novel.content?.length || 0}</span>
                      <span>收藏: {novel.favoritesCount || 0}</span>
                      <span>评论: {novel.comments?.length || 0}</span>
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" className="!px-3 !py-1.5 text-xs" onClick={() => { setSelectedNovel(novel); setCurrentView('read'); }}>
                      阅读
                    </Button>
                    {/* 点击编辑按钮时，会触发 openEditView，带着这本小说的数据进入表单 */}
                    <Button variant="secondary" className="!px-3 !py-1.5 text-xs" onClick={() => openEditView(novel)} title="编辑内容">
                      <Edit size={14} className="mr-1" /> 编辑
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

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
              <span className={`font-extrabold text-xl tracking-tight ${t.navText}`}>青鸟学会：图书馆</span>
            </div>
            
            <div className="flex items-center gap-1 md:gap-4">
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

              {user && userProfile.isRegistered ? (
                <>
                  <button 
                    onClick={() => { resetUploadForm(); setCurrentView('upload'); }} // 清空表单进入发布模式
                    className={`p-2 md:px-4 md:py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 ${currentView === 'upload' && !editingNovelId ? t.navItemActive : t.navItem}`}
                  >
                    <Upload size={18} /> <span className="hidden md:inline">发布</span>
                  </button>
                  <div className={`w-px h-6 mx-1 md:mx-2 ${t.navDivider}`}></div>
                  <button 
                    onClick={() => setCurrentView('profile')}
                    className={`p-2 md:px-4 md:py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 ${currentView === 'profile' || (currentView === 'upload' && editingNovelId) ? t.navItemActive : t.navItem}`}
                  >
                    <User size={18} /> <span className="hidden md:inline">{userProfile.name}</span>
                  </button>
                  <button 
                    onClick={handleLogout}
                    title="退出登录"
                    className={`p-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 hover:text-red-500`}
                  >
                    <LogOut size={18} />
                  </button>
                </>
              ) : (
                <>
                  <div className={`w-px h-6 mx-1 md:mx-2 ${t.navDivider}`}></div>
                  <button 
                    onClick={() => setCurrentView('auth')}
                    className={`p-2 md:px-4 md:py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 ${currentView === 'auth' ? t.navItemActive : t.navItem}`}
                  >
                    <LogIn size={18} /> <span className="hidden md:inline">登录 / 注册</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="pb-20">
        {currentView === 'auth' && renderAuth()}
        {currentView === 'home' && renderHome()}
        {currentView === 'upload' && renderUpload()}
        {currentView === 'profile' && renderProfile()}
        {currentView === 'read' && renderReadView()}
      </main>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}