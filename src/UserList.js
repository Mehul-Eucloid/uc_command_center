import { useState, useEffect, useRef } from "react";
import { useNavigate } from 'react-router-dom';
import { Button } from "./components/ui/button.js";
import eucloidLogo from "./components/ui/eucloid.png";
import { Input } from "./components/ui/input.js";
import { Card } from "./components/ui/card.js";
import { Info } from "lucide-react";
import DeleteUserButton from './components/ui/DeleteUserButton.js';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from "./components/ui/dialog.js";
import { getAvatarInitials, getAvatarColor } from './components/ui/avatar.js';
import { Switch } from "./components/ui/switch.js";
import { 
  Select, 
  SelectItem, 
  SelectContent, 
  SelectTrigger,
  SelectValue
} from "./components/ui/select.js";
import { Bell, Search, Settings, Trash, X, LogOut, Send } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  getUsers, 
  getUserDetails,
  deleteUser, 
  assignUserToGroup, 
  getGroups,
  updateUser,
  getUserGroups,
  createUser,
  createCatalog,
  createGroup,
  createSchema,
  grantPrivileges,
  getWorkspaceStats
} from "./services/api.js";
import FuzzySet from 'fuzzyset.js';
import { 
  FaRobot,
  FaTimes,
  FaTrash,
  FaHistory
} from "react-icons/fa";

const BackgroundElements = () => {
  return (
    <div className="fixed inset-0 overflow-hidden -z-10">
      <motion.div
        initial={{ x: -100, y: -100 }}
        animate={{
          x: [0, 100, 0],
          y: [0, 50, 0],
          transition: { duration: 20, repeat: Infinity, ease: "linear" }
        }}
        className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-gradient-to-br from-indigo-600 to-indigo-800 opacity-10 blur-xl"
      />
      <motion.div
        initial={{ x: 200, y: 300 }}
        animate={{
          x: [0, -100, 0],
          y: [0, -150, 0],
          transition: { duration: 25, repeat: Infinity, ease: "linear" }
        }}
        className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-gradient-to-br from-indigo-600 to-indigo-800 opacity-10 blur-xl"
      />
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiM3YzNkZjkiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0di00aC0ydjRoLTR2Mmg0djRoMnYtNGg0di0yaC00em0wLTMwVjBoLTJ2NGgtNHYyaDR2NGgydi00aDR2LTJoLTR6TTYgMzR2LTRINHY0SDB2Mmg0djRINnYtNGg0di0ySDZ6TTYgNFYwSDR2NEgwdjJoNHY0SDZ2LTRoNHYtMkg2eiIvPjwvZz48L2c+PC9zdmc+')] opacity-5" />
    </div>
  );
};

const HandRaiseAnimation = () => {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24">
      <path
        fill="#FFD700"
        d="M12 2c-5.52 0-10 4.48-10 10s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"
      />
    </svg>
  );
};

const AnimatedHand = () => {
  return (
    <motion.svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      animate={{
        rotate: [0, -45, 0, 45, 0],
        y: [0, -3, 0, -3, 0],
        transition: { duration: 2, repeat: Infinity, ease: "easeInOut" }
      }}
    >
      <path
        fill="#FFD700"
        d="M12 2c-5.52 0-10 4.48-10 10s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"
      />
    </motion.svg>
  );
};

export default function UserList() {
  const [userGroups, setUserGroups] = useState({});
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [userDetails, setUserDetails] = useState(null);
  const [isDetailsLoading, setIsDetailsLoading] = useState(false); // New state for dialog loading
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedWorkspace, setSelectedWorkspace] = useState("db_certification");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editedName, setEditedName] = useState("");
  const [editedEmail, setEditedEmail] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { sender: "bot", text: "Hello! I can help you manage users, groups, catalogs, schemas, and privileges. I can also provide workspace optimization suggestions and business insights. Try commands like 'create catalog my_catalog', 'create user', 'grant privileges', or 'optimize workspace'." }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [searchHistory, setSearchHistory] = useState([]);
  const [isBotTyping, setIsBotTyping] = useState(false);
  const chatContainerRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    } else {
      navigate("/");
    }
  }, [navigate]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const [usersData, groupsData] = await Promise.all([
          getUsers(),
          getGroups()
        ]);
        
        const usersWithGroups = usersData.map(user => ({
          ...user,
          groups: user.groups || []
        }));
        
        setUsers(usersWithGroups);
        setGroups(groupsData);
      } catch (err) {
        setError(err.response?.data?.error || err.message || "Failed to load user data");
        setUsers([]);
        setGroups([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, []);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const commandKeywords = [
    "create", "catalog", "user", "group", "schema", "in", "grant", "privileges", "to", "on",
    "optimize", "workspace", "business", "insights", "suggestions", "improve"
  ];

  const fuzzySet = FuzzySet(commandKeywords);

  const correctSpelling = (input) => {
    const words = input.toLowerCase().split(/\s+/);
    const correctedWords = words.map(word => {
      const match = fuzzySet.get(word);
      if (match && match[0][0] > 0.7) {
        return match[0][1];
      }
      return word;
    });
    return correctedWords.join(" ");
  };

  const fetchUserDetails = async (userId) => {
    try {
      setIsDetailsLoading(true); // Set dialog-specific loading state
      setError(null);
      setDetailsDialogOpen(true); // Open dialog immediately
      console.log(`Fetching details for user ID: ${userId}`); // Debug log
      if (!userId) {
        throw new Error('Invalid user ID');
      }
      const details = await getUserDetails(userId);
      console.log('User details response:', details); // Debug log
      if (details) {
        setUserDetails(details);
      } else {
        setError('No user details returned from the server');
        setUserDetails(null);
      }
    } catch (error) {
      console.error('Error fetching user details:', {
        userId,
        message: error.message,
        status: error.response?.status,
        response: error.response?.data
      });
      let errorMessage;
      if (error.response?.status === 404) {
        errorMessage = `User with ID ${userId} not found. The user may have been deleted or the details endpoint is unavailable.`;
      } else if (error.response?.status === 401) {
        errorMessage = 'Unauthorized: Please log in again.';
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
      } else {
        errorMessage = error.response?.data?.error || error.message || 'Failed to fetch user details. Please try again later.';
      }
      setError(errorMessage);
      setUserDetails(null);
    } finally {
      setIsDetailsLoading(false); // Clear dialog-specific loading state
    }
  };

  const generateWorkspaceInsights = async () => {
    try {
      const workspaceStats = await getWorkspaceStats();
      const {
        totalCatalogs,
        totalSchemas,
        totalTables,
        totalUsers,
        activeUsers,
        catalogData,
        usageData,
        recentQueries,
        privilegeDistribution
      } = workspaceStats;

      const insights = [];

      const totalStorage = catalogData.reduce((sum, catalog) => sum + catalog.value, 0);
      const highStorageCatalogs = catalogData.filter(catalog => catalog.value > totalStorage * 0.3);
      if (highStorageCatalogs.length > 0) {
        insights.push({
          severity: 'High',
          title: 'High Storage Usage Detected',
          description: `Catalog(s) ${highStorageCatalogs.map(c => c.name).join(', ')} are using ${highStorageCatalogs.reduce((sum, c) => sum + c.value, 0)} MB, which is more than 30% of total storage (${totalStorage} MB).`,
          recommendation: 'Review these catalogs for unused or old data.'
        });
      }

      const querySpikes = usageData.filter(day => day.queries > 100);
      if (querySpikes.length > 0) {
        insights.push({
          severity: 'Medium',
          title: 'Query Spikes Detected',
          description: `On ${querySpikes.map(day => day.day).join(', ')}, query counts exceeded 100 (${querySpikes.map(day => day.queries).join(', ')}).`,
          recommendation: 'Consider load balancing by scheduling queries during off-peak hours.'
        });
      }

      const engagementRate = (activeUsers / totalUsers) * 100;
      if (engagementRate < 30) {
        insights.push({
          severity: 'Medium',
          title: 'Low User Engagement',
          description: `Only ${activeUsers} out of ${totalUsers} users are active (${engagementRate.toFixed(1)}% engagement rate).`,
          recommendation: 'Engage inactive users through training sessions.'
        });
      }

      const privilegeChartData = Object.entries(privilegeDistribution.byPrivilege).map(([name, value]) => ({
        name,
        value
      }));
      const excessivePrivileges = privilegeChartData.filter(priv => priv.value > totalUsers * 0.5);
      if (excessivePrivileges.length > 0) {
        insights.push({
          severity: 'High',
          title: 'Excessive Privilege Assignments',
          description: `Privileges like ${excessivePrivileges.map(p => p.name).join(', ')} are assigned to more than 50% of users.`,
          recommendation: 'Audit privilege assignments.'
        });
      }

      const problematicQueries = recentQueries.filter(q => q.status === 'FAILED' || parseFloat(q.duration) > 60);
      if (problematicQueries.length > 0) {
        insights.push({
          severity: 'Medium',
          title: 'Problematic Queries Detected',
          description: `Found ${problematicQueries.length} problematic queries.`,
          recommendation: 'Optimize these queries.'
        });
      }

      return insights.length > 0 ? insights : [{ severity: 'Low', title: 'No Critical Issues', description: 'Your workspace is running smoothly.', recommendation: 'Continue monitoring.' }];
    } catch (error) {
      return [{ severity: 'Error', title: 'Failed to Analyze Workspace', description: 'Unable to fetch workspace data.', recommendation: 'Please try again later.' }];
    }
  };

  const handleChatSubmit = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    setSearchHistory((prev) => [...prev, chatInput].slice(-10));
    setChatMessages((prev) => [...prev, { sender: "user", text: chatInput }]);
    let input = chatInput.trim().toLowerCase();
    setChatInput("");
    setIsBotTyping(true);

    input = correctSpelling(input);

    try {
      if (input.startsWith("create catalog")) {
        const match = input.match(/create catalog\s+(.+)/);
        if (!match) {
          setChatMessages((prev) => [
            ...prev,
            { sender: "bot", text: "Please provide a catalog name. Usage: create catalog <name>" },
          ]);
          return;
        }
        const catalogName = match[1].trim();
        await createCatalog({ name: catalogName, comment: `Created via chatbot on ${new Date().toISOString()}` });
        setChatMessages((prev) => [
          ...prev,
          { sender: "bot", text: `Catalog '${catalogName}' created successfully!` },
        ]);
      } else if (input.startsWith("create user")) {
        const match = input.match(/create user\s+(.+)/);
        let email = "default@example.com";
        let displayName = "New User";
        if (match) {
          email = match[1].trim();
          displayName = email.split("@")[0];
        }
        const userData = { email, displayName };
        await createUser(userData);
        setChatMessages((prev) => [
          ...prev,
          { sender: "bot", text: `User '${email}' created successfully!` },
        ]);
        const updatedUsers = await getUsers();
        setUsers(updatedUsers.map(user => ({ ...user, groups: user.groups || [] })));
      } else if (input.startsWith("create group")) {
        const match = input.match(/create group\s+(.+)/);
        if (!match) {
          setChatMessages((prev) => [
            ...prev,
            { sender: "bot", text: "Please provide a group name. Usage: create group <name>" },
          ]);
          return;
        }
        const groupName = match[1].trim();
        await createGroup({ name: groupName });
        setChatMessages((prev) => [
          ...prev,
          { sender: "bot", text: `Group '${groupName}' created successfully!` },
        ]);
        const updatedGroups = await getGroups();
        setGroups(updatedGroups);
      } else if (input.startsWith("create schema")) {
        const match = input.match(/create schema\s+(.+)\s+in catalog\s+(.+)/);
        if (!match) {
          setChatMessages((prev) => [
            ...prev,
            { sender: "bot", text: "Please provide a schema name and catalog. Usage: create schema <schema_name> in catalog <catalog_name>" },
          ]);
          return;
        }
        const schemaName = match[1].trim();
        const catalogName = match[2].trim();
        await createSchema({ catalogName, name: schemaName, comment: `Created via chatbot on ${new Date().toISOString()}` });
        setChatMessages((prev) => [
          ...prev,
          { sender: "bot", text: `Schema '${schemaName}' created in catalog '${catalogName}' successfully!` },
        ]);
      } else if (input.startsWith("grant privileges")) {
        const match = input.match(/grant privileges\s+(.+)\s+to\s+(.+)\s+on\s+(.+)\s+(.+)/);
        if (!match) {
          setChatMessages((prev) => [
            ...prev,
            { sender: "bot", text: "Please provide privileges, principal, securable type, and name. Usage: grant privileges <privileges> to <principal> on <securable_type> <name>" },
          ]);
          return;
        }
        const privileges = match[1].split(",").map(p => p.trim().toUpperCase());
        const principal = match[2].trim();
        const securable_type = match[3].trim();
        const full_name = match[4].trim();
        await grantPrivileges({ securable_type, full_name, principal, privileges });
        setChatMessages((prev) => [
          ...prev,
          { sender: "bot", text: `Privileges '${privileges.join(", ")}' granted to '${principal}' on ${securable_type} '${full_name}' successfully!` },
        ]);
      } else if (input.includes("optimize") || input.includes("workspace") || input.includes("business") || input.includes("insights") || input.includes("suggestions") || input.includes("improve")) {
        setChatMessages((prev) => [
          ...prev,
          { sender: "bot", text: "Analyzing your workspace for optimization opportunities..." },
        ]);

        const insights = await generateWorkspaceInsights();
       
        let responseText = "Here are my recommendations for optimizing your workspace:\n\n";
        insights.forEach((insight, index) => {
          responseText += `${index + 1}. **${insight.title}** (${insight.severity})\n`;
          responseText += `   - **Issue**: ${insight.description}\n`;
          responseText += `   - **Recommendation**: ${insight.recommendation}\n\n`;
        });
        responseText += "Would you like to take action on any of these recommendations?";

        setChatMessages((prev) => [
          ...prev,
          { sender: "bot", text: responseText },
        ]);
      } else {
        setChatMessages((prev) => [
          ...prev,
          { sender: "bot", text: "I didn't understand that command. Try 'create catalog <name>', 'create user', 'create group <name>', 'create schema <schema_name> in catalog <catalog_name>', 'grant privileges <privileges> to <principal> on <securable_type> <name>', or 'optimize workspace'." },
        ]);
      }
    } catch (error) {
      setChatMessages((prev) => [
        ...prev,
        { sender: "bot", text: `Error: ${error.message}` },
      ]);
    } finally {
      setIsBotTyping(false);
    }
  };

  const handleClearChat = () => {
    setChatMessages([
      { sender: "bot", text: "Hello! I can help you manage users, groups, catalogs, schemas, and privileges. I can also provide workspace optimization suggestions and business insights. Try commands like 'create catalog my_catalog', 'create user', 'grant privileges', or 'optimize workspace'." }
    ]);
    setSearchHistory([]);
  };

  const quickActions = [
    { label: "Create User", command: "create user" },
    { label: "Create Catalog", command: "create catalog new_catalog" },
    { label: "Optimize Workspace", command: "optimize workspace" }
  ];

  const handleQuickAction = (command) => {
    setChatInput(command);
    handleChatSubmit({ preventDefault: () => {} });
  };

  const handleHistoryClick = (historyItem) => {
    setChatInput(historyItem);
    handleChatSubmit({ preventDefault: () => {} });
  };

  const NavLink = ({ to, children, className }) => (
    <button 
      onClick={() => navigate(to)}
      className={className}
    >
      {children}
    </button>
  );
  
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate("/login");
  };

  const usersPerPage = 10;
  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(search.toLowerCase()) ||
    user.email.toLowerCase().includes(search.toLowerCase())
  );
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
  const paginatedUsers = filteredUsers.slice(
    (page - 1) * usersPerPage, 
    page * usersPerPage
  );

  const handleAssignGroup = (user) => {
    setSelectedUser(user);
    setOpenDialog(true);
  };

  const handleGroupAssignment = async (groupId) => {
    try {
      setIsLoading(true);
      await assignUserToGroup(selectedUser.id, groupId);
      const updatedUsers = await getUsers();
      setUsers(updatedUsers);
      setOpenDialog(false);
    } catch (err) {
      setError(err.message || 'Failed to assign user to group');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditClick = (user) => {
    setEditingUser(user);
    setEditedName(user.name);
    setEditedEmail(user.email);
    setEditDialogOpen(true);
  };

  const handleEditSave = async () => {
    try {
      setIsLoading(true);
      const updatedUser = await updateUser(editingUser.id, {
        name: editedName,
        email: editedEmail
      });
      setUsers(prevUsers =>
        prevUsers.map(user =>
          user.id === editingUser.id ? updatedUser : user
        )
      );
      setEditDialogOpen(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUserDelete = async (userId) => {
    try {
      setIsLoading(true);
      setError(null);
      await deleteUser(userId);
      setUsers(prevUsers => prevUsers.filter(user => user.id !== userId));
      setUserGroups(prev => {
        const newGroups = {...prev};
        delete newGroups[userId];
        return newGroups;
      });
    } catch (err) {
      setError(err.message || 'Failed to delete user');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const displayName = user?.email ? user.email.split('@')[0] : 'User';

  return (
    <div className="min-h-screen p-6 relative overflow-hidden">
      <BackgroundElements />
      
      <div className="relative z-10">
        <nav className="flex items-center justify-between border-b border-indigo-100 pb-4 mb-6 px-6 bg-white/90 backdrop-blur-sm rounded-lg shadow-sm">
          <div className="flex items-center space-x-4 pr-8">
            <a href="/home" className="flex items-center">
              <img 
                src={eucloidLogo} 
                alt="Eucloid UC Manager" 
                className="h-10"
              />
            </a>
          </div>

          <div className="flex-1 flex justify-center">
            <div className="flex items-center space-x-8">
              <NavLink 
                to="/home" 
                className="text-lg font-medium text-gray-500 hover:text-indigo-600 transition-colors"
              >
                Home
              </NavLink>
              <NavLink 
                to="/users" 
                className="text-lg font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
              >
                Users
              </NavLink>
              <NavLink 
                to="/groups" 
                className="text-lg font-medium text-gray-500 hover:text-indigo-600 transition-colors"
              >
                Groups
              </NavLink>
              <NavLink 
                to="/catalog" 
                className="text-lg font-medium text-gray-500 hover:text-indigo-600 transition-colors"
              >
                Catalog
              </NavLink>
              <NavLink 
                to="/grant" 
                className="text-lg font-medium text-gray-500 hover:text-indigo-600 transition-colors"
              >
                Grant
              </NavLink>
              <NavLink to="/migration" className="text-lg font-medium text-gray-500 hover:text-indigo-600 transition-colors">Migration</NavLink>
            </div>
          </div>

          <div className="flex items-center space-x-4 pl-8">
            <Select 
              value={selectedWorkspace} 
              onValueChange={setSelectedWorkspace}
            >
              <SelectTrigger className="w-[180px] bg-white/90 hover:bg-gray-50 border border-indigo-100">
                <SelectValue placeholder="Select Workspace" />
              </SelectTrigger>
              <SelectContent className="bg-white border border-indigo-100">
                <SelectItem value="db_certification">db_certification</SelectItem>
                <SelectItem value="demo">demo</SelectItem>
              </SelectContent>
            </Select>
            
            <Button 
              variant="ghost"
              className="text-gray-600 hover:text-red-600 transition-colors"
              onClick={handleLogout}
            >
              <LogOut className="h-5 w-5 mr-2" />
              Logout
            </Button>
            
            <Search className="h-5 w-5 cursor-pointer text-gray-500 hover:text-indigo-600 transition-colors" />
            <Bell className="h-5 w-5 cursor-pointer text-gray-500 hover:text-indigo-600 transition-colors" />
            <Settings className="h-5 w-5 cursor-pointer text-gray-500 hover:text-indigo-600 transition-colors" />
            <div className="relative group">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white font-medium border border-indigo-100"
                style={{ backgroundColor: getAvatarColor(displayName) }}
              >
                {getAvatarInitials(displayName)}
              </div>
              <motion.div
                className="absolute right-0 top-10 hidden group-hover:block bg-gray-800 text-white text-sm rounded-lg p-2 shadow-lg z-50 min-w-[200px]"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                <p className="font-semibold">{displayName}</p>
                <p>{user?.email || 'No email available'}</p>
              </motion.div>
            </div>
          </div>
        </nav>

        <div className="max-w-6xl mx-auto bg-white/90 backdrop-blur-sm p-6 rounded-xl border border-indigo-50 shadow-sm">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl font-bold mb-6 bg-gradient-to-r from-indigo-600 to-indigo-400 bg-clip-text text-transparent">
              User Management
            </h2>
            
            {error && (
              <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md flex justify-between items-center">
                <span>{error}</span>
                <button 
                  onClick={() => setError(null)}
                  className="text-red-700 hover:text-red-900"
                  aria-label="Dismiss error"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            <div className="relative mb-6 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search users..."
                className="pl-10 border-indigo-100 focus:border-indigo-300 focus:ring-indigo-200"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                disabled={isLoading}
              />
            </div>

            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  {paginatedUsers.map((user) => (
                    <motion.div
                      key={user.id}
                      whileHover={{ scale: 1.005 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Card className="p-4 hover:shadow-md transition-shadow border-indigo-50">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className={`w-12 h-12 rounded-full ${getAvatarColor(user.name)} flex items-center justify-center text-white font-medium`}>
                              {getAvatarInitials(user.name)}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-gray-800">{user.name}</p>
                                <button 
                                  onClick={() => fetchUserDetails(user.id)}
                                  className="text-gray-400 hover:text-indigo-600 transition-colors"
                                  aria-label="View user details"
                                >
                                  <Info className="h-4 w-4" />
                                </button>
                              </div>
                              <p className="text-sm text-gray-500">{user.email}</p>
                              <div className="mt-1 flex flex-wrap gap-1">
                                {user.groups?.length > 0 ? (
                                  user.groups.map((group) => (
                                    <span 
                                      key={`${user.id}-${group.id}`}
                                      className="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full"
                                    >
                                      {group.name}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded-full">
                                    Not Assigned
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex space-x-2">
                            <Button 
                              className="bg-gradient-to-r from-indigo-600 to-indigo-500 text-white px-4 py-2 rounded-md hover:from-indigo-700 hover:to-indigo-600 transition-all w-40 whitespace-nowrap shadow-sm"
                              variant={!user.groups?.length ? "default" : "outline"} 
                              onClick={() => handleAssignGroup(user)}
                              disabled={isLoading}
                            >
                              {!user.groups?.length ? "Assign Group" : "Change Group"}
                            </Button>
                            
                            <DeleteUserButton 
                              userId={user.id}
                              userName={user.name}
                              onDelete={handleUserDelete}
                              disabled={isLoading}
                            />
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className="mt-6 flex justify-center space-x-2">
                    <Button 
                      variant="outline" 
                      disabled={page === 1 || isLoading}
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      className="border-indigo-100 hover:bg-indigo-50 text-indigo-600"
                    >
                      Previous
                    </Button>
                    
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (page <= 3) {
                        pageNum = i + 1;
                      } else if (page >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = page - 2 + i;
                      }

                      return (
                        <Button
                          key={pageNum}
                          variant={page === pageNum ? "default" : "outline"}
                          onClick={() => setPage(pageNum)}
                          disabled={isLoading}
                          className={page === pageNum ? 
                            "bg-gradient-to-r from-indigo-600 to-indigo-500 text-white" : 
                            "border-indigo-100 hover:bg-indigo-50 text-indigo-600"}
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                    
                    <Button 
                      variant="outline" 
                      disabled={page === totalPages || isLoading}
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      className="border-indigo-100 hover:bg-indigo-50 text-indigo-600"
                    >
                      Next
                    </Button>
                  </div>
                )}

                <div className="flex flex-col items-center mt-8">
                  <p className="text-gray-600 mb-4">If user not found, create user</p>
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button 
                      className="bg-gradient-to-r from-indigo-600 to-indigo-500 text-white px-6 py-3 rounded-lg hover:from-indigo-700 hover:to-indigo-600 transition-all shadow-md hover:shadow-lg"
                      onClick={() => navigate("/create-user")}
                      disabled={isLoading}
                    >
                      Create User
                    </Button>
                  </motion.div>
                </div>
              </>
            )}
          </motion.div>

          <Dialog open={openDialog} onOpenChange={setOpenDialog}>
            <DialogContent className="sm:max-w-[425px] bg-white shadow-lg rounded-lg border border-indigo-100">
              <DialogHeader>
                <DialogTitle className="bg-gradient-to-r from-indigo-600 to-indigo-400 bg-clip-text text-transparent">
                  {!selectedUser?.groups?.length 
                    ? "Assign to Group" 
                    : `Change Group for ${selectedUser?.name}`}
                </DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <Input 
                  placeholder="Search groups..." 
                  className="col-span-full border-indigo-100 focus:border-indigo-300 focus:ring-indigo-200"
                />
                
                <div className="space-y-2">
                  {groups.map((group) => (
                    <motion.div
                      key={group.id}
                      whileHover={{ scale: 1.01 }}
                      className="flex items-center justify-between p-3 border border-indigo-50 rounded-lg hover:border-indigo-100 transition-colors"
                    >
                      <div>
                        <p className="font-medium text-gray-800">{group.name}</p>
                        <p className="text-sm text-gray-500">
                          {group.users} members
                        </p>
                      </div>
                      <Switch 
                        checked={selectedUser?.groups?.some(g => g.id === group.id)}
                        onCheckedChange={() => handleGroupAssignment(group.id)}
                        className="data-[state=checked]:bg-indigo-600 data-[state=unchecked]:bg-gray-300"
                        disabled={isLoading}
                      />
                    </motion.div>
                  ))}
                </div>
              </div>
              
              <div className="text-center text-sm text-gray-500">
                Can't find the right group?{' '}
                <button 
                  className="text-indigo-600 hover:underline hover:text-indigo-800 transition-colors"
                  onClick={() => navigate("/groups/create")}
                >
                  Create new group
                </button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
            <DialogContent className="sm:max-w-[425px] bg-white shadow-lg rounded-lg border border-indigo-100">
              <DialogHeader>
                <DialogTitle className="bg-gradient-to-r from-indigo-600 to-indigo-400 bg-clip-text text-transparent">
                  Edit User
                </DialogTitle>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                    Username
                  </label>
                  <Input
                    id="username"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    className="border-indigo-100 focus:border-indigo-300 focus:ring-indigo-200"
                    disabled={isLoading}
                  />
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Email
                  </label>
                  <Input
                    id="email"
                    value={editedEmail}
                    onChange={(e) => setEditedEmail(e.target.value)}
                    className="border-indigo-100 focus:border-indigo-300 focus:ring-indigo-200"
                    disabled={isLoading}
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-3">
                <Button 
                  variant="outline" 
                  onClick={() => setEditDialogOpen(false)}
                  className="border-indigo-100 text-gray-700 hover:bg-indigo-50 hover:text-gray-900"
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleEditSave}
                  className="bg-gradient-to-r from-indigo-600 to-indigo-500 text-white hover:from-indigo-700 hover:to-indigo-600 shadow-sm"
                  disabled={isLoading}
                >
                  {isLoading ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
            <DialogContent className="sm:max-w-lg bg-white shadow-2xl rounded-2xl border border-gray-100 p-6">
              <DialogHeader>
                <DialogTitle className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent text-2xl mb-4">
                  User Details
                </DialogTitle>
              </DialogHeader>
             
              <div className="space-y-6">
                {isDetailsLoading ? (
                  <div className="flex justify-center items-center h-32">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
                  </div>
                ) : error ? (
                  <p className="text-red-700 bg-red-50 p-4 rounded-xl border border-red-100">{error}</p>
                ) : userDetails ? (
                  <>
                    <div className="space-y-3">
                      <label className="block text-sm font-semibold text-gray-800">
                        User ID
                      </label>
                      <Input
                        value={userDetails.id || 'N/A'}
                        readOnly
                        className="border-gray-200 rounded-xl bg-gray-50 py-2.5 text-sm text-gray-700 focus:ring-0 cursor-default"
                      />
                    </div>

                    <div className="space-y-3">
                      <label className="block text-sm font-semibold text-gray-800">
                        Name
                      </label>
                      <Input
                        value={userDetails.displayName || 'N/A'}
                        readOnly
                        className="border-gray-200 rounded-xl bg-gray-50 py-2.5 text-sm text-gray-700 focus:ring-0 cursor-default"
                      />
                    </div>

                    <div className="space-y-3">
                      <label className="block text-sm font-semibold text-gray-800">
                        Email
                      </label>
                      <Input
                        value={userDetails.userName || 'N/A'}
                        readOnly
                        className="border-gray-200 rounded-xl bg-gray-50 py-2.5 text-sm text-gray-700 focus:ring-0 cursor-default"
                      />
                    </div>

                   
                    
                    <div className="space-y-3">
                      <label className="block text-sm font-semibold text-gray-800">
                        Group
                      </label>
                      {userDetails.groups?.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="w-full border-collapse rounded-lg shadow-sm bg-white">
                            <thead>
                              <tr className="bg-indigo-50 text-indigo-800">
                                <th className="text-left p-3 text-xs font-semibold uppercase tracking-wider border-b border-gray-200 rounded-tl-lg">Group Name</th>
                                <th className="text-left p-3 text-xs font-semibold uppercase tracking-wider border-b border-gray-200 rounded-tr-lg">Group ID</th>
                              </tr>
                            </thead>
                            <tbody>
                              {userDetails.groups.map((group, index) => (
                                <tr key={index} className="hover:bg-gray-50 transition-colors">
                                  <td className="p-3 text-sm text-gray-800 border-b border-gray-100">{group.name}</td>
                                  <td className="p-3 text-sm text-gray-800 border-b border-gray-100">{group.id}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <span className="inline-block text-xs bg-gray-100 text-gray-600 px-3 py-1.5 rounded-full font-medium">
                          No Groups Assigned
                        </span>
                      )}
                    </div>
                    
                    <div className="space-y-3">
                      <label className="block text-sm font-semibold text-gray-800">
                        Role
                      </label>
                      {userDetails.roles?.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="w-full border-collapse rounded-lg shadow-sm bg-white">
                            <thead>
                              <tr className="bg-indigo-50 text-indigo-800">
                                <th className="text-left p-3 text-xs font-semibold uppercase tracking-wider border-b border-gray-200 rounded-tl-lg">Role Name</th>
                                <th className="text-left p-3 text-xs font-semibold uppercase tracking-wider border-b border-gray-200 rounded-tr-lg">Description</th>
                              </tr>
                            </thead>
                            <tbody>
                              {userDetails.roles.map((role, index) => (
                                <tr key={index} className="hover:bg-gray-50 transition-colors">
                                  <td className="p-3 text-sm text-gray-800 border-b border-gray-100">{role.name || 'N/A'}</td>
                                  <td className="p-3 text-sm text-gray-800 border-b border-gray-100">{role.description || 'No description available'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <span className="inline-block text-xs bg-gray-100 text-gray-600 px-3 py-1.5 rounded-full font-medium">
                          No Roles Assigned
                        </span>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="text-gray-500 text-sm">No details available</p>
                )}
              </div>
             
              <div className="mt-6 flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setDetailsDialogOpen(false);
                    setUserDetails(null); // Clear user details when closing
                    setError(null); // Clear error when closing
                  }}
                  className="border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-gray-900 rounded-xl px-5 py-2.5 transition-colors"
                  disabled={isDetailsLoading}
                >
                  Close
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="fixed bottom-6 right-6 z-50">
          <AnimatePresence>
            {!isChatOpen && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="relative flex flex-col items-center"
              >
                <motion.div
                  className="flex items-center space-x-2 mb-2 bg-indigo-600 text-white text-sm rounded-lg p-2 shadow-lg z-50"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.2 }}
                >
                  <AnimatedHand />
                  <span>Hi, I am Here to Help!</span>
                </motion.div>
                <motion.div
                  animate={{
                    scale: [1, 1.1, 1],
                    transition: { duration: 1.5, repeat: Infinity, ease: "easeInOut" }
                  }}
                  whileHover={{ scale: 1.15 }}
                  whileTap={{ scale: 0.95 }}
                  className="relative"
                >
                  <div className="absolute inset-0 rounded-full bg-gradient-to-r from-indigo-400 to-indigo-600 opacity-50 blur-lg animate-pulse" />
                  <Button
                    onClick={() => setIsChatOpen(true)}
                    className="relative bg-gradient-to-r from-indigo-600 to-indigo-500 text-white rounded-full p-4 shadow-xl hover:shadow-2xl hover:from-indigo-700 hover:to-indigo-600 transition-all duration-300"
                    aria-label="Open chatbot"
                  >
                    <FaRobot className="h-7 w-7" />
                  </Button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {isChatOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 flex items-center justify-center z-50"
              onClick={() => setIsChatOpen(false)}
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="relative w-[700px] h-[500px] rounded-lg shadow-2xl border border-indigo-200 flex flex-col overflow-hidden bg-white"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="chat-header bg-indigo-600 text-white px-4 py-3 border-b border-indigo-200 flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <HandRaiseAnimation />
                    <h3 className="text-base font-semibold tracking-tight">Here is your Chatbot!</h3>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Button
                      variant="ghost"
                      onClick={() => setIsChatOpen(false)}
                      className="text-gray-300 hover:text-white hover:bg-indigo-500/30 p-1.5 rounded-full transition-colors"
                      aria-label="Close chat"
                    >
                      <FaTimes className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex flex-col flex-1 overflow-hidden">
                  {searchHistory.length > 0 && (
                    <div className="p-4 border-b border-indigo-200">
                      <div className="flex items-center space-x-2 mb-2">
                        <FaHistory className="h-5 w-5 text-indigo-400" />
                        <h4 className="text-gray-800 text-sm font-semibold">Search History</h4>
                      </div>
                      <div className="max-h-24 overflow-y-auto flex flex-wrap gap-2">
                        {searchHistory.map((item, index) => (
                          <Button
                            key={index}
                            variant="outline"
                            size="sm"
                            onClick={() => handleHistoryClick(item)}
                            className="text-gray-800 border-indigo-400 bg-indigo-100 hover:bg-indigo-200 hover:text-gray-800 transition-colors rounded-full px-3 py-1 text-xs font-medium"
                          >
                            {item}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div
                    ref={chatContainerRef}
                    className="flex-1 p-4 overflow-y-auto"
                    style={{ scrollbarWidth: 'thin', scrollbarColor: '#a5b4fc #e0e7ff' }}
                  >
                    <motion.div
                      className="text-center text-gray-800 text-lg font-semibold mb-4 flex items-center justify-center space-x-2"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5 }}
                    >
                      <HandRaiseAnimation />
                      <span>Hi, I am Here to Help!</span>
                    </motion.div>
                    <AnimatePresence>
                      {chatMessages.map((message, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.2 }}
                          className={`mb-4 flex ${
                            message.sender === "user" ? "justify-end" : "justify-start"
                          }`}
                        >
                          <div
                            className={`flex items-start space-x-2 max-w-[70%] ${
                              message.sender === "user" ? "flex-row-reverse space-x-reverse" : ""
                            }`}
                          >
                            {message.sender === "bot" && (
                              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-medium bg-indigo-500">
                                <FaRobot className="h-5 w-5" />
                              </div>
                            )}
                            <div
                              className={`p-3 rounded-lg shadow-sm ${
                                message.sender === "user"
                                  ? "bg-indigo-600 text-white"
                                  : "bg-indigo-100 text-gray-800"
                              }`}
                            >
                              <p className="text-sm leading-relaxed">{message.text}</p>
                              <div className="text-xs mt-1 opacity-70 text-right">
                                {new Date().toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </div>
                            </div>
                            {message.sender === "user" && (
                              <div
                                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium bg-indigo-600"
                              >
                                {getAvatarInitials(displayName)}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      ))}
                      {isBotTyping && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="flex items-center space-x-2 mb-4"
                        >
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-medium bg-indigo-500">
                            <FaRobot className="h-5 w-5" />
                          </div>
                          <div className="flex space-x-1">
                            <div
                              className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"
                              style={{ animationDelay: "0s" }}
                            ></div>
                            <div
                              className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"
                              style={{ animationDelay: "0.2s" }}
                            ></div>
                            <div
                              className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"
                              style={{ animationDelay: "0.4s" }}
                            ></div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
                <div className="p-4 border-t border-indigo-200 bg-white">
                  <div className="flex flex-wrap gap-2 mb-3">
                    {quickActions.map((action, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuickAction(action.command)}
                        className="text-gray-800 border-indigo-400 bg-indigo-100 hover:bg-indigo-200 hover:text-gray-800 transition-colors rounded-full px-3 py-1 text-xs font-medium"
                      >
                        {action.label}
                      </Button>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleClearChat}
                      className="text-red-600 border-red-600 bg-white hover:bg-red-50 hover:text-red-700 transition-colors rounded-full px-3 py-1 text-xs font-medium"
                    >
                      <FaTrash className="h-3 w-3 mr-1" />
                      Clear Chat
                    </Button>
                  </div>
                  <form onSubmit={handleChatSubmit} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Say Something..."
                      className="flex-1 p-2.5 border border-indigo-400 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-800 text-sm transition-all placeholder:text-gray-400"
                      aria-label="Chat input"
                    />
                    <Button
                      type="submit"
                      className="bg-indigo-600 text-white hover:bg-indigo-700 rounded-full p-2.5 shadow-sm hover:shadow-md transition-all"
                      disabled={!chatInput.trim()}
                      aria-label="Send message"
                    >
                      <Send className="h-5 w-5" />
                    </Button>
                  </form>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}