import { useState, useMemo, useEffect } from 'react';
import { Search, Plus, ExternalLink, Trash2, Loader2, AlertCircle, Lock, LogOut } from 'lucide-react';
import { initialICPs } from './initialData';
import { ICP, ResponseType } from './types';
import { collection, onSnapshot, doc, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { db, auth } from './firebase';
import { onAuthStateChanged, User, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';

const GEMINI_API_KEY = "AIzaSyARhqV7rc138-t7SjSO66vPWEMHbkyrcF0";

function getFollowUpInfo(dateSent: string | null, response: ResponseType): { label: string, isUrgent: boolean, isDueToday: boolean } {
  if (!dateSent || response !== 'No Reply') return { label: '', isUrgent: false, isDueToday: false };

  const msPerDay = 1000 * 60 * 60 * 24;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const sent = new Date(dateSent);
  sent.setHours(0, 0, 0, 0);

  const daysElapsed = Math.floor((today.getTime() - sent.getTime()) / msPerDay);

  let label = '';
  let isUrgent = false;
  let isDueToday = false;

  if (daysElapsed < 0) {
     return { label: 'Invalid Date', isUrgent: false, isDueToday: false };
  } else if (daysElapsed <= 3) {
    label = 'Awaiting';
    if (daysElapsed === 3) isUrgent = true;
  } else if (daysElapsed <= 9) {
    label = 'Day 04: Follow-Up 1 (The Soft Check)';
    if (daysElapsed === 4) isDueToday = true;
    if (daysElapsed === 9) isUrgent = true;
  } else if (daysElapsed <= 20) {
    label = 'Day 10: Follow-Up 2 (The Double Down)';
    if (daysElapsed === 10) isDueToday = true;
    if (daysElapsed === 20) isUrgent = true;
  } else if (daysElapsed <= 89) {
    label = 'Day 21: Final Follow-Up (The Takeaway)';
    if (daysElapsed === 21) isDueToday = true;
    if (daysElapsed === 89) isUrgent = true;
  } else {
    label = 'Day 90: Re-engagement Touch (The Arise)';
    if (daysElapsed === 90) isDueToday = true;
  }

  return { label, isUrgent, isDueToday };
}

const StatCard = ({ title, value, highlight }: { title: string, value: string | number, highlight: boolean }) => (
  <div className={`flex-1 min-w-[160px] p-4 rounded-2xl border ${highlight ? 'bg-[#FF6321]/20 border-[#FF6321]/50 shadow-[0_0_15px_rgba(255,99,33,0.1)]' : 'bg-[#111] border-white/10'} flex flex-col gap-2 shrink-0 transition-colors`}>
    <span className={`text-[10px] uppercase font-bold tracking-widest leading-tight ${highlight ? 'text-[#FF6321]' : 'text-white/40'}`}>{title}</span>
    <span className="text-3xl font-light">{value}</span>
  </div>
);

const LoginScreen = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    
    try {
      const provider = new GoogleAuthProvider();
      // Optional: force select account if desired by adding custom parameters
      // provider.setCustomParameters({ prompt: 'select_account' });
      
      const result = await signInWithPopup(auth, provider);
      
      // Restrict access
      if (result.user.email !== 'abdullahaipro285@gmail.com') {
        await signOut(auth);
        setError('Access denied. Only abdullahaipro285@gmail.com is authorized.');
        return;
      }
    } catch (err: any) {
      console.error("Login error:", err);
      if (err.code === 'auth/unauthorized-domain') {
         setError('Domain not authorized. Add this URL to Firebase Auth -> Settings -> Authorized domains.');
      } else if (err.code === 'auth/configuration-not-found' || err.code === 'auth/operation-not-allowed') {
         setError('Google Auth is not enabled in Firebase project. Please enable it in Authentication -> Sign-in method.');
      } else if (err.code === 'auth/popup-closed-by-user') {
         setError('Sign-in popup was closed before completion.');
      } else {
         setError(err.message || 'Login failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4 font-sans selection:bg-[#FF6321]/30 selection:text-white">
      <div className="max-w-sm w-full bg-[#111] border border-white/10 rounded-3xl p-8 flex flex-col gap-8 shadow-2xl">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#FF6321]/10 border border-[#FF6321]/30 flex items-center justify-center">
            <Lock className="w-7 h-7 text-[#FF6321]" />
          </div>
          <div>
            <h1 className="text-2xl font-light tracking-wide mb-1">Trojan Engine</h1>
            <p className="text-[10px] uppercase tracking-widest text-[#FF6321] font-bold">Secure Access</p>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-xs px-4 py-3 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <p className="leading-snug">{error}</p>
            </div>
          )}
          
          <button 
            onClick={handleGoogleLogin}
            disabled={loading}
            className="mt-4 bg-white text-black hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed font-bold uppercase tracking-wider text-xs px-6 py-4 rounded-xl shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-all flex items-center justify-center gap-3 h-[52px]"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Sign In with Google
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [icps, setIcps] = useState<ICP[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [activeIcpId, setActiveIcpId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIcps, setSelectedIcps] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<'createdAt' | 'name' | 'company' | 'dateSent' | 'followUp'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [filterResponse, setFilterResponse] = useState<string>('All');
  const [filterFollowUp, setFilterFollowUp] = useState<string>('All');
  const [icpsToDelete, setIcpsToDelete] = useState<ICP[] | null>(null);
  const [lastDeletedDocs, setLastDeletedDocs] = useState<ICP[] | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user) return;
    
    let seeded = false;
    const unsub = onSnapshot(collection(db, 'icps'), (snapshot) => {
      if (snapshot.empty && !seeded) {
        seeded = true;
        const seedData = async () => {
          try {
            const batch = writeBatch(db);
            // Reverse so they appear in correct original order when sorted desc by createdAt
            [...initialICPs].reverse().forEach((icp, i) => {
              const docRef = doc(collection(db, 'icps'));
              batch.set(docRef, { ...icp, id: docRef.id, createdAt: Date.now() + i });
            });
            await batch.commit();
          } catch (err) {
            setSyncError("Sync failed — check your connection.");
            setIsLoading(false);
          }
        };
        seedData();
      } else {
        const data = snapshot.docs.map(d => d.data() as ICP);
        data.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        setIcps(data);
        setIsLoading(false);
      }
    }, (err) => {
      setSyncError("Sync failed — check your connection.");
      setIsLoading(false);
      console.error(err);
    });

    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (!isLoading && !activeIcpId && icps.length > 0) {
      setActiveIcpId(icps[0].id);
    }
  }, [isLoading, icps, activeIcpId]);

  const activeIcp = useMemo(() => icps.find(icp => icp.id === activeIcpId) || null, [icps, activeIcpId]);

  const filteredIcps = useMemo(() => {
    let result = icps;

    // Search
    if (searchQuery) {
      result = result.filter(icp => 
        (icp.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
        (icp.point || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (icp.company || '').toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter Response
    if (filterResponse !== 'All') {
       result = result.filter(icp => icp.response === filterResponse);
    }

    // Filter FollowUp
    if (filterFollowUp !== 'All') {
       result = result.filter(icp => {
          const followUp = getFollowUpInfo(icp.dateSent, icp.response);
          if (filterFollowUp === 'Urgent') return followUp.isUrgent;
          if (filterFollowUp === 'Due Today') return followUp.isDueToday;
          if (filterFollowUp === 'Awaiting') return followUp.label === 'Awaiting';
          if (filterFollowUp === 'Follow-Up 1') return followUp.label.includes('Follow-Up 1');
          if (filterFollowUp === 'Follow-Up 2') return followUp.label.includes('Follow-Up 2');
          if (filterFollowUp === 'Final Follow-Up') return followUp.label.includes('Final Follow-Up');
          if (filterFollowUp === 'Re-engagement') return followUp.label.includes('Re-engagement touch');
          return true;
       });
    }

    // Sort
    result = [...result].sort((a, b) => {
       if (sortBy === 'createdAt') {
          return sortOrder === 'desc' ? (b.createdAt || 0) - (a.createdAt || 0) : (a.createdAt || 0) - (b.createdAt || 0);
       }
       if (sortBy === 'name') {
          return sortOrder === 'desc' ? (b.name || '').localeCompare(a.name || '') : (a.name || '').localeCompare(b.name || '');
       }
       if (sortBy === 'company') {
          return sortOrder === 'desc' ? (b.company || '').localeCompare(a.company || '') : (a.company || '').localeCompare(b.company || '');
       }
       if (sortBy === 'dateSent') {
          const dateA = a.dateSent ? new Date(a.dateSent).getTime() : 0;
          const dateB = b.dateSent ? new Date(b.dateSent).getTime() : 0;
          return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
       }
       if (sortBy === 'followUp') {
          const followUpA = getFollowUpInfo(a.dateSent, a.response);
          const followUpB = getFollowUpInfo(b.dateSent, b.response);
          
          const getScore = (f: { label: string, isUrgent: boolean, isDueToday: boolean }) => {
            if (f.isUrgent) return 6;
            if (f.isDueToday) return 5;
            if (f.label.includes('Follow-Up 1')) return 4;
            if (f.label.includes('Follow-Up 2')) return 3;
            if (f.label.includes('Final')) return 2;
            if (f.label.includes('Re-engagement')) return 1;
            if (f.label === 'Awaiting') return 0;
            return -1; // Done/No follow-up
          };
          
          const scoreA = getScore(followUpA);
          const scoreB = getScore(followUpB);
          
          if (scoreA !== scoreB) {
            return sortOrder === 'desc' ? scoreB - scoreA : scoreA - scoreB;
          }
          return 0;
       }
       return 0;
    });

    return result;
  }, [icps, searchQuery, sortBy, sortOrder, filterResponse, filterFollowUp]);

  const stats = useMemo(() => {
    let sentCount = 0;
    let awaitingCount = 0;
    let repliedCount = 0;
    let dueTodayCount = 0;

    icps.forEach(icp => {
      if (icp.trojanHorseSent) sentCount++;
      if (icp.trojanHorseSent && icp.response === 'No Reply') awaitingCount++;
      if (icp.response === 'Replied' || icp.response === 'Booked' || icp.response === 'Positive') repliedCount++;
      
      const followUp = getFollowUpInfo(icp.dateSent, icp.response);
      if (followUp.isDueToday) dueTodayCount++;
    });

    return { total: icps.length, sentCount, awaitingCount, repliedCount, dueTodayCount };
  }, [icps]);

  const handleUpdateActiveIcp = async (field: keyof ICP, value: any) => {
    if (!activeIcpId || !activeIcp) return;

    const updates: Partial<ICP> = { [field]: value };
      
    // Auto Date Stamp Rule
    if (field === 'trojanHorseSent') {
      if (value === true && !activeIcp.dateSent) {
        const tzDate = new Date();
        updates.dateSent = new Date(tzDate.getTime() - (tzDate.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
      } else if (value === false) {
        updates.dateSent = null;
      }
    }

    try {
      await setDoc(doc(db, 'icps', activeIcpId), updates, { merge: true });
    } catch (err) {
      setSyncError("Sync failed — check your connection.");
    }
  };

  const handleNewIcp = async () => {
    const newDocRef = doc(collection(db, 'icps'));
    const newIcp: ICP = {
      id: newDocRef.id,
      name: 'New Client',
      topic: '',
      point: '',
      transcript: '',
      timestamps: '',
      link: '',
      status: 'draft',
      title: '',
      company: '',
      linkedinUrl: '',
      trojanHorseSent: false,
      dateSent: null,
      response: 'No Reply',
      createdAt: Date.now()
    };
    
    setActiveIcpId(newIcp.id);
    
    try {
      await setDoc(newDocRef, newIcp);
    } catch (err) {
      setSyncError("Sync failed — check your connection.");
    }
  };

  const extractCorePoint = async () => {
    if (!activeIcp || !activeIcp.transcript) {
      setExtractError("Paste a transcript first.");
      return;
    }

    setIsExtracting(true);
    setExtractError(null);

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `You are a one-line insight extractor.\n\nRules:\n- Output exactly ONE sentence. Nothing else.\n- No intro, no label, no punctuation besides the sentence itself.\n- Write in plain, direct English — no jargon.\n- Capture the sharpest, most counterintuitive or actionable insight.\n- Do not summarize the whole transcript. Extract the single strongest point.\n\nTranscript:\n${activeIcp.transcript}`
                  }
                ]
              }
            ]
          })
        }
      );
      const data = await response.json();
      const point = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      
      if (point) {
        handleUpdateActiveIcp('point', point);
      } else {
        setExtractError("Failed to extract. Try again.");
      }
    } catch (error) {
      setExtractError("Failed to extract. Try again.");
    } finally {
      setIsExtracting(false);
    }
  };

  const copyScript = async () => {
    if (!activeIcp) return;
    const scriptText = `Subject: Prepared a short highlight for LinkedIn\n\nhey ${activeIcp.name || '[Name]'},\n\ni was listening to your episode on ${activeIcp.topic || '[Topic]'}.\n\nthe Point where you guys talked about ${activeIcp.point || '[Point]'}. ... that was sharp, so I cut a short LinkedIn-ready clip from it for you.\n\nG-Drive link: ${activeIcp.link || '[Link]'}\n\nby the way, do you usually post these highlights yourself?`;
    
    try {
      await navigator.clipboard.writeText(scriptText);
      alert('Script copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if modal is open
      if (icpsToDelete) return;

      const activeTag = document.activeElement?.tagName.toLowerCase();
      // Ignore if user is typing
      if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') {
        return;
      }

      // Backspace or Delete on active, unless they are using bulk, then we delete selected. 
      // It's cleaner to just delete selected if any, else active.
      if ((e.key === 'Backspace' || e.key === 'Delete')) {
        if (selectedIcps.size > 0) {
          e.preventDefault();
          setIcpsToDelete(icps.filter(i => selectedIcps.has(i.id)));
        } else if (activeIcpId) {
          e.preventDefault();
          const icp = icps.find(i => i.id === activeIcpId);
          if (icp) setIcpsToDelete([icp]);
        }
      }

      // Ctrl + Z or Cmd + Z undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        if (lastDeletedDocs) {
          e.preventDefault();
          const restoredDocs = lastDeletedDocs;
          setLastDeletedDocs(null);
          const restoreDocs = async () => {
            const batch = writeBatch(db);
            for (const docData of restoredDocs) {
              batch.set(doc(db, 'icps', docData.id), docData);
            }
            try {
              await batch.commit();
              if (restoredDocs.length === 1) setActiveIcpId(restoredDocs[0].id);
            } catch (err) {
              setSyncError("Restore failed — check connection");
            }
          };
          restoreDocs();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeIcpId, icps, lastDeletedDocs, icpsToDelete, selectedIcps]);

  const confirmDelete = async () => {
    if (!icpsToDelete || icpsToDelete.length === 0) return;
    
    setLastDeletedDocs(icpsToDelete);
    const idsToDelete = icpsToDelete.map(i => i.id);
    setSelectedIcps(new Set()); // clear selection

    if (activeIcpId && idsToDelete.includes(activeIcpId)) {
      setActiveIcpId(null);
    }

    setIcpsToDelete(null);
    try {
      const batch = writeBatch(db);
      for (const id of idsToDelete) {
         batch.delete(doc(db, 'icps', id));
      }
      await batch.commit();
    } catch (err) {
      setSyncError("Sync failed — check your connection.");
    }
  };

  const handleToggleSelectId = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSelectedIcps(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
         <Loader2 className="w-8 h-8 animate-spin text-[#FF6321]" />
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  return (
    <div className="flex-1 w-full max-w-[1400px] mx-auto p-4 md:p-6 overflow-hidden flex flex-col gap-4 font-sans text-[#e5e5e5]">
      
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between bg-[#111] border border-white/10 rounded-2xl p-4 gap-4 shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-[#FF6321] rounded-lg flex items-center justify-center font-bold text-black shrink-0">
            T
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight uppercase">Trojan Engine</h1>
            <p className="text-[10px] text-white/40 uppercase tracking-[0.2em]">ICP Highlight Manager</p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <input 
              type="text" 
              placeholder="Search ICPs..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-black border border-white/10 rounded-full pl-10 pr-4 py-2 text-sm w-full sm:w-64 focus:outline-none focus:border-[#FF6321] transition-colors"
            />
            <Search className="w-4 h-4 absolute left-4 top-2.5 opacity-30" />
          </div>
          <button 
            onClick={handleNewIcp}
            className="bg-white hover:bg-gray-200 text-black px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-colors shrink-0 flex items-center justify-center gap-1"
          >
            <Plus className="w-4 h-4" /> New Client
          </button>
          <button 
            onClick={() => signOut(auth)}
            className="bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20 px-3 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-colors shrink-0 flex items-center justify-center gap-1"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Stats Dashboard */}
      <div className="flex flex-row overflow-x-auto custom-scrollbar gap-4 shrink-0">
        <StatCard title="Total ICPs" value={stats.total} highlight={false} />
        <StatCard title="Trojan Horses Sent" value={stats.sentCount} highlight={false} />
        <StatCard title="Awaiting Reply" value={stats.awaitingCount} highlight={false} />
        <StatCard title="Replied / Booked" value={stats.repliedCount} highlight={false} />
        <StatCard title="Follow-Ups Due Today" value={stats.dueTodayCount} highlight={stats.dueTodayCount > 0} />
      </div>

      {/* Main Content Grid */}
      <main className="flex-1 min-h-0 flex flex-col lg:flex-row gap-4">
        
        {/* Sidebar - List */}
        <aside className="w-full lg:w-[300px] bg-[#111] border border-white/10 rounded-3xl p-4 flex flex-col gap-3 shrink-0 h-64 lg:h-auto">
          <div className="flex flex-col gap-2 mb-2 px-1">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Entries</span>
              <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded text-white/60">{filteredIcps.length}</span>
            </div>
            
            {/* Filters & Sort */}
            <div className="flex flex-col gap-2 bg-white/5 p-2 rounded-xl border border-white/5">
              <div className="flex gap-2">
                <select 
                  value={sortBy} 
                  onChange={e => setSortBy(e.target.value as any)}
                  className="bg-black/50 border border-white/10 text-[10px] rounded px-1.5 py-1 text-white/70 flex-1 outline-none focus:border-[#FF6321]"
                  title="Sort By"
                >
                  <option value="createdAt">Added Date</option>
                  <option value="name">Name</option>
                  <option value="company">Company</option>
                  <option value="dateSent">Date Sent</option>
                  <option value="followUp">Follow-up Status</option>
                </select>
                <button 
                  onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                  className="bg-black/50 border border-white/10 rounded px-1.5 py-1 text-[10px] text-white/70 hover:text-[#FF6321] transition-colors"
                  title="Toggle Sort Order"
                >
                  {sortOrder === 'desc' ? 'DESC' : 'ASC'}
                </button>
              </div>
              <div className="flex gap-2">
                <select
                  value={filterResponse}
                  onChange={e => setFilterResponse(e.target.value)}
                  className="bg-black/50 border border-white/10 text-[10px] rounded px-1.5 py-1 text-white/70 flex-1 w-0 outline-none focus:border-[#FF6321]"
                  title="Filter by Response"
                >
                  <option value="All">All Responses</option>
                  <option value="No Reply">No Reply</option>
                  <option value="Replied">Replied</option>
                  <option value="Booked">Booked</option>
                  <option value="Positive">Positive</option>
                </select>
                <select
                  value={filterFollowUp}
                  onChange={e => setFilterFollowUp(e.target.value)}
                  className="bg-black/50 border border-white/10 text-[10px] rounded px-1.5 py-1 text-white/70 flex-1 w-0 outline-none focus:border-[#FF6321]"
                  title="Filter by Follow-Up"
                >
                  <option value="All">All Stages</option>
                  <option value="Urgent">Urgent</option>
                  <option value="Due Today">Due Today</option>
                  <option value="Awaiting">Awaiting</option>
                  <option value="Follow-Up 1">Follow-Up 1</option>
                  <option value="Follow-Up 2">Follow-Up 2</option>
                  <option value="Final Follow-Up">Final</option>
                  <option value="Re-engagement">Re-engagement</option>
                </select>
              </div>
            </div>

            {/* Bulk Actions */}
            {selectedIcps.size > 0 && (
               <div className="flex justify-between items-center bg-red-500/10 border border-red-500/20 rounded-xl p-2 mt-1">
                 <span className="text-[10px] text-red-500 font-bold uppercase">{selectedIcps.size} Selected</span>
                 <button 
                   onClick={() => setIcpsToDelete(icps.filter(i => selectedIcps.has(i.id)))}
                   className="text-[10px] font-bold uppercase tracking-wider bg-red-500/20 text-red-500 hover:bg-red-500/40 px-2 py-1 rounded transition-colors"
                 >
                   Delete Selected
                 </button>
               </div>
            )}
          </div>
          <div className="flex flex-col gap-2 overflow-y-auto pr-1 pb-4 flex-1 custom-scrollbar">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-full py-8 text-white/40 gap-3">
                <Loader2 className="w-5 h-5 animate-spin text-[#FF6321]" />
                <span className="text-[10px] uppercase font-bold tracking-widest">Loading...</span>
              </div>
            ) : filteredIcps.map(icp => {
              const isActive = icp.id === activeIcpId;
              const followUp = getFollowUpInfo(icp.dateSent, icp.response);
              const isUrgentContext = followUp.isUrgent;
              const isSelected = selectedIcps.has(icp.id);
              
              return (
                <div 
                  key={icp.id}
                  onClick={() => setActiveIcpId(icp.id)}
                  className={`border rounded-xl p-3 cursor-pointer transition-all ${
                    isActive 
                      ? 'bg-white/5 border-[#FF6321]/50 ring-1 ring-[#FF6321]' 
                      : isSelected
                      ? 'bg-[#FF6321]/10 border-[#FF6321]/30'
                      : followUp.isDueToday ? 'bg-[#FF6321]/5 border-[#FF6321]/30 hover:bg-[#FF6321]/10'
                      : isUrgentContext ? 'bg-yellow-500/5 border-yellow-500/30 hover:border-yellow-500/50 hover:bg-yellow-500/10' 
                      : 'bg-transparent border-white/5 opacity-60 hover:opacity-100'
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <div className="flex items-center gap-2 overflow-hidden pr-2">
                       <input 
                         type="checkbox"
                         checked={isSelected}
                         onChange={(e) => { e.stopPropagation(); }}
                         onClick={(e) => handleToggleSelectId(e, icp.id)}
                         className="w-3.5 h-3.5 cursor-pointer accent-[#FF6321] shrink-0"
                       />
                       {followUp.isDueToday && <div className="w-1.5 h-1.5 rounded-full bg-[#FF6321] shadow-[0_0_8px_rgba(255,99,33,0.8)] shrink-0" />}
                       {isUrgentContext && !followUp.isDueToday && <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.8)] shrink-0" />}
                       <h3 className="text-sm font-semibold truncate">{icp.name || 'Unnamed'}</h3>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`text-[9px] uppercase font-bold shrink-0 mt-0.5 ${
                        icp.response === 'Positive' || icp.response === 'Replied' || icp.response === 'Booked' ? 'text-green-500' :
                        icp.trojanHorseSent ? 'text-[#FF6321]' : 'text-white/30'
                      }`}>
                        {icp.trojanHorseSent ? (icp.response === 'No Reply' ? 'Awaiting' : icp.response) : 'Draft'}
                      </span>
                      {followUp.isDueToday && <span className="px-1.5 py-0.5 rounded-sm bg-[#FF6321]/20 text-[#FF6321] text-[8px] uppercase font-bold tracking-widest leading-none">Due Today</span>}
                      {isUrgentContext && !followUp.isDueToday && <span className="px-1.5 py-0.5 rounded-sm bg-yellow-500/20 text-yellow-500 text-[8px] uppercase font-bold tracking-widest leading-none">Urgent</span>}
                    </div>
                  </div>
                  <p className="text-[11px] text-white/50 line-clamp-1">{icp.company || icp.title || 'No company info'}</p>
                </div>
              );
            })}
            {filteredIcps.length === 0 && (
              <div className="text-center text-sm text-white/30 py-8 italic">No entries found.</div>
            )}
          </div>
        </aside>

        {/* Editor Container */}
        <div className="flex-1 min-w-0 flex flex-col xl:flex-row gap-4 min-h-0">
          
          {/* Middle - Editor */}
          <section className="w-full xl:w-7/12 bg-[#111] border border-white/10 rounded-3xl p-5 md:p-6 flex flex-col gap-4 overflow-y-auto custom-scrollbar">
            {activeIcp ? (
              <>
                <div className="border-b border-white/5 pb-4 flex justify-between items-center">
                  <h2 className="text-xl font-light italic">Client Profile Editor</h2>
                  <button 
                    onClick={() => setIcpsToDelete([activeIcp])}
                    className="p-2 text-white/30 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors flex items-center justify-center"
                    title="Delete Entry (Backspace)"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                
                {/* Name & Title */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase text-white/40 font-bold tracking-wider">Client Name</label>
                    <input 
                      type="text" 
                      value={activeIcp.name || ''}
                      onChange={(e) => handleUpdateActiveIcp('name', e.target.value)}
                      className="bg-black border border-white/10 rounded-lg p-2.5 text-sm focus:outline-none focus:border-[#FF6321] transition-colors"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase text-white/40 font-bold tracking-wider">Title</label>
                    <input 
                      type="text" 
                      value={activeIcp.title || ''}
                      onChange={(e) => handleUpdateActiveIcp('title', e.target.value)}
                      className="bg-black border border-white/10 rounded-lg p-2.5 text-sm focus:outline-none focus:border-[#FF6321] transition-colors"
                      placeholder="e.g. Founder & CEO"
                    />
                  </div>
                </div>

                {/* Company & Topic */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase text-white/40 font-bold tracking-wider">Company</label>
                    <input 
                      type="text" 
                      value={activeIcp.company || ''}
                      onChange={(e) => handleUpdateActiveIcp('company', e.target.value)}
                      className="bg-black border border-white/10 rounded-lg p-2.5 text-sm focus:outline-none focus:border-[#FF6321] transition-colors"
                      placeholder="e.g. Acme Corp"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase text-white/40 font-bold tracking-wider">Topic / Episode</label>
                    <input 
                      type="text" 
                      value={activeIcp.topic || ''}
                      onChange={(e) => handleUpdateActiveIcp('topic', e.target.value)}
                      className="bg-black border border-white/10 rounded-lg p-2.5 text-sm focus:outline-none focus:border-[#FF6321] transition-colors"
                    />
                  </div>
                </div>

                {/* LinkedIn */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase text-white/40 font-bold tracking-wider">LinkedIn URL</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={activeIcp.linkedinUrl || ''}
                      onChange={(e) => handleUpdateActiveIcp('linkedinUrl', e.target.value)}
                      className="bg-black border border-white/10 rounded-lg p-2.5 text-sm focus:outline-none focus:border-[#FF6321] font-mono text-[11px] transition-colors flex-1"
                      placeholder="https://www.linkedin.com/in/..."
                    />
                    <button 
                      onClick={() => window.open(activeIcp.linkedinUrl, '_blank')}
                      disabled={!activeIcp.linkedinUrl}
                      className="px-3 py-2 bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold uppercase tracking-wider rounded-lg flex items-center justify-center gap-1.5 transition-colors shrink-0"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Open</span>
                    </button>
                  </div>
                </div>

                {/* Campaign Controls */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col md:flex-row gap-4 items-start md:items-center">
                  <div className="flex items-center gap-2 shrink-0">
                    <input 
                      type="checkbox" 
                      checked={activeIcp.trojanHorseSent || false}
                      onChange={(e) => handleUpdateActiveIcp('trojanHorseSent', e.target.checked)}
                      className="w-4 h-4 accent-[#FF6321] cursor-pointer"
                      id="trojanSent"
                    />
                    <label htmlFor="trojanSent" className="text-xs uppercase text-white/90 font-bold tracking-wider cursor-pointer select-none">Sent</label>
                  </div>
                  
                  <div className="w-full md:w-px h-px md:h-6 bg-white/10 block"></div>

                  <div className="flex items-center gap-2 w-full md:w-auto">
                    <label className="text-[10px] uppercase text-white/40 font-bold tracking-wider whitespace-nowrap">Date:</label>
                    <input 
                      type="date"
                      value={activeIcp.dateSent || ''}
                      onChange={(e) => handleUpdateActiveIcp('dateSent', e.target.value)}
                      disabled={!activeIcp.trojanHorseSent}
                      className="bg-black border border-white/10 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-[#FF6321] disabled:opacity-50 flex-1 md:flex-none"
                    />
                  </div>

                  <div className="w-full md:w-px h-px md:h-6 bg-white/10 block"></div>

                  <div className="flex items-center gap-2 w-full md:w-auto md:flex-1">
                    <label className="text-[10px] uppercase text-white/40 font-bold tracking-wider whitespace-nowrap">Response:</label>
                    <select 
                      value={activeIcp.response || 'No Reply'}
                      onChange={(e) => handleUpdateActiveIcp('response', e.target.value as ResponseType)}
                      className="bg-black border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white/90 focus:outline-none focus:border-[#FF6321] flex-1 min-w-[100px]"
                    >
                      <option value="No Reply">No Reply</option>
                      <option value="Replied">Replied</option>
                      <option value="Booked">Booked</option>
                      <option value="Positive">Positive</option>
                    </select>
                  </div>
                </div>

                {/* FollowUp Banner */}
                {(() => {
                  const followUpInfo = getFollowUpInfo(activeIcp.dateSent, activeIcp.response);
                  if (!followUpInfo.label) return null;
                  return (
                    <div className={`p-3 rounded-xl border flex items-center justify-between transition-colors ${
                      followUpInfo.isUrgent ? 'bg-yellow-500/10 border-yellow-500/40' : 
                      followUpInfo.isDueToday ? 'bg-[#FF6321]/10 border-[#FF6321]/40' : 
                      'bg-white/5 border-white/10'
                    }`}>
                      <div className="flex flex-col">
                        <span className="text-[10px] uppercase font-bold tracking-widest text-white/50 mb-0.5">Follow-Up Stage</span>
                        <span className={`text-sm font-semibold tracking-wide ${followUpInfo.isUrgent ? 'text-yellow-400' : followUpInfo.isDueToday ? 'text-[#FF6321]' : 'text-white'}`}>
                          {followUpInfo.label}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        {followUpInfo.isUrgent && <span className="text-[10px] uppercase font-bold tracking-wider text-yellow-500 bg-yellow-500/10 px-2 py-1 rounded">Tomorrow</span>}
                        {followUpInfo.isDueToday && <span className="text-[10px] uppercase font-bold tracking-wider text-[#FF6321] bg-[#FF6321]/10 px-2 py-1 rounded">Due Today</span>}
                      </div>
                    </div>
                  );
                })()}

                {/* Core Point & Links */}
                <div className="flex flex-col gap-1.5 mt-2">
                  <label className="text-[10px] uppercase text-white/40 font-bold tracking-wider">The Core Point</label>
                  <textarea 
                    value={activeIcp.point || ''}
                    onChange={(e) => handleUpdateActiveIcp('point', e.target.value)}
                    className="bg-black border border-white/10 rounded-lg p-3 text-sm h-20 resize-none focus:outline-none focus:border-[#FF6321] transition-colors custom-scrollbar"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase text-white/40 font-bold tracking-wider">G-Drive Link / Asset</label>
                    <input 
                      type="text" 
                      value={activeIcp.link || ''}
                      onChange={(e) => handleUpdateActiveIcp('link', e.target.value)}
                      className="bg-black border border-white/10 rounded-lg p-2.5 text-sm focus:outline-none focus:border-[#FF6321] font-mono text-[11px] transition-colors"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase text-white/40 font-bold tracking-wider">Timestamps</label>
                    <input 
                      type="text" 
                      value={activeIcp.timestamps || ''}
                      onChange={(e) => handleUpdateActiveIcp('timestamps', e.target.value)}
                      className="bg-black border border-white/10 rounded-lg p-2.5 text-sm focus:outline-none focus:border-[#FF6321] transition-colors"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 flex-1 min-h-[100px]">
                  <div className="flex justify-between items-end">
                    <label className="text-[10px] uppercase text-white/40 font-bold tracking-wider">Transcript Excerpt</label>
                    <div className="flex flex-col items-end gap-1">
                      {extractError && <span className="text-[10px] text-red-500 font-bold tracking-wider uppercase">{extractError}</span>}
                      <button 
                        onClick={extractCorePoint}
                        disabled={isExtracting}
                        className="px-3 py-1.5 bg-[#FF6321]/10 hover:bg-[#FF6321]/20 text-[#FF6321] border border-[#FF6321]/30 rounded-lg text-[10px] items-center gap-1.5 font-bold uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex shrink-0 h-7"
                      >
                        {isExtracting ? (
                          <>
                            <div className="w-2.5 h-2.5 border border-[#FF6321]/30 border-t-[#FF6321] rounded-full animate-spin"></div>
                            Processing...
                          </>
                        ) : 'Extract Core Point'}
                      </button>
                    </div>
                  </div>
                  <textarea 
                    value={activeIcp.transcript || ''}
                    onChange={(e) => handleUpdateActiveIcp('transcript', e.target.value)}
                    className="bg-black border border-white/10 rounded-lg p-3 text-xs leading-relaxed text-white/60 flex-1 min-h-[100px] resize-none focus:outline-none focus:border-[#FF6321] transition-colors custom-scrollbar"
                  />
                </div>
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-white/30 italic text-sm gap-2">
                <span>Select an entry to edit</span>
              </div>
            )}
          </section>

          {/* Right - Script Preview */}
          <section className="w-full xl:w-5/12 flex flex-col gap-4 overflow-y-auto custom-scrollbar px-1 pb-1">
            <div className="flex-1 min-h-[350px] bg-[#1a1a1a] border border-[#FF6321]/30 rounded-3xl p-5 md:p-6 flex flex-col gap-4 shadow-[0_0_40px_rgba(255,99,33,0.05)] shrink-0">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-[#FF6321]"></div>
                <h2 className="text-sm font-bold uppercase tracking-widest text-[#FF6321]">Trojan Horse Script</h2>
              </div>
              
              <div className="bg-black/40 rounded-2xl p-5 flex flex-col gap-3 font-mono text-[12px] leading-relaxed border border-white/5 flex-1 overflow-y-auto custom-scrollbar">
                <p className="text-white/40">Subject: Prepared a short highlight for LinkedIn</p>
                <div className="w-full h-px bg-white/5 my-1"></div>
                
                <p>hey <span className="text-[#FF6321]">{activeIcp?.name || '[Name]'}</span>,</p>
                <p>i was listening to your episode on <span className="text-[#FF6321] font-medium">{activeIcp?.topic || '[Topic]'}</span>.</p>
                <p>the Point where you guys talked about <span className="text-[#FF6321] font-medium">{activeIcp?.point || '[Point]'}</span>. ... that was sharp, so I cut a short LinkedIn-ready clip from it for you.</p>
                <p>G-Drive link: <span className="text-[#FF6321] underline break-all">{activeIcp?.link || '[Link]'}</span></p>
                <p>by the way, do you usually post these highlights yourself?</p>
              </div>

              <button 
                onClick={copyScript}
                disabled={!activeIcp}
                className="mt-auto w-full bg-[#FF6321] hover:bg-[#e5591e] disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 transition-colors uppercase text-xs tracking-widest shrink-0"
              >
                Copy Prepared Script
              </button>
            </div>
          </section>

        </div>
      </main>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
          height: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 99, 33, 0.5);
        }
      `}</style>

      {/* Sync Error Toast */}
      {syncError && (
        <div className="fixed top-6 right-6 bg-red-500/10 border border-red-500/30 rounded-full px-5 py-3 flex items-center gap-3 shadow-[0_0_20px_rgba(239,68,68,0.2)] z-50 transition-all">
          <AlertCircle className="w-4 h-4 text-red-500" />
          <span className="text-xs font-bold uppercase tracking-wider text-red-500">{syncError}</span>
          <button onClick={() => setSyncError(null)} className="ml-2 text-red-500/50 hover:text-red-500 transition-colors">
            ×
          </button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {icpsToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111] border border-[#FF6321]/30 rounded-3xl p-6 max-w-md w-full shadow-[0_0_40px_rgba(255,99,33,0.1)] flex flex-col gap-4">
            <h3 className="text-xl font-light text-white">Delete {icpsToDelete.length > 1 ? `${icpsToDelete.length} Entries` : 'Entry'}?</h3>
            <p className="text-sm text-white/60 leading-relaxed">
              Are you sure you want to delete {icpsToDelete.length > 1 ? `these ${icpsToDelete.length} entries` : <><span className="text-[#FF6321] font-bold">{icpsToDelete[0]?.name || 'this entry'}</span></>}? 
            </p>
            <div className="flex justify-end gap-3 mt-2">
              <button 
                onClick={() => setIcpsToDelete(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-white/60 hover:text-white hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDelete}
                className="px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20 transition-colors"
              >
                Delete {icpsToDelete.length > 1 ? 'Entries' : 'Entry'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Undo Toast */}
      {lastDeletedDocs && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#1a1a1a] border border-white/10 rounded-full px-4 py-3 flex items-center gap-3 shadow-2xl z-40">
          <span className="text-xs text-white/70">{lastDeletedDocs.length} ICP{lastDeletedDocs.length > 1 ? 's' : ''} deleted.</span>
          <div className="w-px h-3 bg-white/10"></div>
          <button 
            onClick={() => {
              const restoredDocs = lastDeletedDocs;
              setLastDeletedDocs(null);
              const restoreDocs = async () => {
                const batch = writeBatch(db);
                for (const docData of restoredDocs) {
                  batch.set(doc(db, 'icps', docData.id), docData);
                }
                try {
                  await batch.commit();
                  if (restoredDocs.length === 1) setActiveIcpId(restoredDocs[0].id);
                } catch (err) {
                  setSyncError("Restore failed — check connection");
                }
              };
              restoreDocs();
            }}
            className="text-xs font-bold uppercase tracking-wider text-[#FF6321] hover:text-[#ff7d47]"
          >
            Undo (Ctrl+Z)
          </button>
        </div>
      )}
    </div>
  );
}
