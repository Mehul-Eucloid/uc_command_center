import { Card, CardContent } from "./components/ui/card.js";
import { motion } from "framer-motion";
import eucloidLogo from "./components/ui/eucloid.png";
import { useState } from "react";
import { Button } from "./components/ui/button.js";
import { getAvatarInitials, getAvatarColor } from './components/ui/avatar.js';
import { 
  FaUserPlus, 
  FaUserMinus, 
  FaUsers, 
  FaUserEdit, 
  FaUserCheck, 
  FaSearch, 
  FaUserTimes, 
  FaUserCog 
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { 
  Select, 
  SelectItem, 
  SelectContent, 
  SelectTrigger,
  SelectValue 
} from "./components/ui/select.js";
import { Bell, Search, Settings } from "lucide-react";

const features = [
  { icon: FaUserPlus, title: "Add User", description: "Create new user accounts and manage credentials." },
  { icon: FaUserMinus, title: "Delete User", description: "Remove users from the system securely." },
  { icon: FaUsers, title: "Add Group", description: "Organize users into groups for easy management." },
  { icon: FaUserEdit, title: "Edit Group", description: "Modify group details and permissions." },
  { icon: FaUserCheck, title: "Add Member", description: "Assign users to specific groups." },
  { icon: FaSearch, title: "Search User", description: "Quickly find users with advanced filters." },
  { icon: FaUserTimes, title: "Remove Member", description: "Unassign users from groups as needed." },
  { icon: FaUserCog, title: "Manage Permissions", description: "Control user access and security settings." }
];

const BackgroundElements = () => {
  return (
    <div className="fixed inset-0 overflow-hidden -z-10">
      {/* Large animated circle */}
      <motion.div
        initial={{ x: -100, y: -100 }}
        animate={{
          x: [0, 100, 0],
          y: [0, 50, 0],
          transition: { duration: 20, repeat: Infinity, ease: "linear" }
        }}
        className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-gradient-to-br from-indigo-600 to-indigo-800 opacity-20 blur-xl"
      />
      
      {/* Medium animated circle */}
      <motion.div
        initial={{ x: 200, y: 300 }}
        animate={{
          x: [0, -100, 0],
          y: [0, -150, 0],
          transition: { duration: 25, repeat: Infinity, ease: "linear" }
        }}
        className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-gradient-to-br from-indigo-600 to-indigo-800 opacity-20 blur-xl"
      />

      {/* Small fast-moving circle */}
      <motion.div
        initial={{ x: 300, y: 100 }}
        animate={{
          x: [0, 200, 0],
          y: [0, 300, 0],
          transition: { duration: 15, repeat: Infinity, ease: "linear" }
        }}
        className="absolute top-1/3 right-1/3 w-32 h-32 rounded-full bg-gradient-to-br from-indigo-600 to-indigo-800 opacity-20 blur-xl"
      />
      {/* Small fast-moving circle */}
      <motion.div
        initial={{ x: 300, y: 100 }}
        animate={{
          x: [0, 900, 0],
          y: [0, 600, 0],
          transition: { duration: 15, repeat: Infinity, ease: "linear" }
        }}
        className="absolute top-1/3 right-1/3 w-32 h-32 rounded-full bg-gradient-to-br from-indigo-600 to-indigo-800 opacity-20 blur-xl"
      />

      {/* Floating particles */}
      {[...Array(12)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ 
            x: Math.random() * 100 - 50,
            y: Math.random() * 100 - 50,
            opacity: 0
          }}
          animate={{
            x: [0, Math.random() * 100 - 50],
            y: [0, Math.random() * 100 - 50],
            opacity: [0, 0.05, 0],
            transition: {
              duration: 15 + Math.random() * 15,
              repeat: Infinity,
              repeatType: "reverse"
            }
          }}
          className="absolute w-2 h-2 rounded-full bg-indigo-600"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
        />
      ))}

      {/* Subtle grid pattern */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiM3YzNkZjkiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0di00aC0ydjRoLTR2Mmg0djRoMnYtNGg0di0yaC00em0wLTMwVjBoLTJ2NGgtNHYyaDR2NGgydi00aDR2LTJoLTR6TTYgMzR2LTRINHY0SDB2Mmg0djRINnYtNGg0di0ySDZ6TTYgNFYwSDR2NEgwdjJoNHY0SDZ2LTRoNHYtMkg2eiIvPjwvZz48L2c+PC9zdmc+')] opacity-10" />
      
      {/* Diagonal gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/0 via-white/5 to-white/0" />
    </div>
  );
};

export default function HomePage() {
  const navigate = useNavigate();
  const [selectedCluster, setSelectedCluster] = useState("Cluster 1");
  const [hoveredFeature, setHoveredFeature] = useState(null);

  const NavLink = ({ to, children, className }) => (
    <button 
      onClick={() => navigate(to)}
      className={className}
    >
      {children}
    </button>
  );

  return (
    <div className="min-h-screen p-6 flex flex-col relative overflow-hidden">
      {/* Background Elements */}
      <BackgroundElements />
      
      {/* Content with higher z-index */}
      <div className="relative z-10">
        {/* Simplified Navbar with glass effect */}
        <nav className="flex items-center justify-between border-b border-indigo-100 pb-4 mb-6 px-6 bg-white/80 backdrop-blur-sm rounded-lg shadow-sm">
        <div className="flex items-center space-x-4 pr-8">
    <a href="/home" className="flex items-center">
      <img 
        src={eucloidLogo} 
        alt="Eucloid UC Manager" 
        className="h-10" // Adjust height as needed
      />
    </a>
  </div>

          <div className="flex-1 flex justify-center">
            <div className="flex items-center space-x-8">
              <NavLink to="/home" className="text-lg font-medium text-indigo-600 hover:text-indigo-800 transition-colors">
                Home
              </NavLink>
            </div>
          </div>

          <div className="flex items-center space-x-4 pl-8">
            <Select 
              value={selectedCluster} 
              onValueChange={setSelectedCluster}
              disabled
            >
              <SelectTrigger className="w-[180px] bg-white/90 hover:bg-gray-50 border border-indigo-100">
                <SelectValue placeholder="Select Cluster" />
              </SelectTrigger>
              <SelectContent className="bg-white border border-indigo-100">
                <SelectItem value="Cluster 1">Cluster 1</SelectItem>
                <SelectItem value="Cluster 2">Cluster 2</SelectItem>
              </SelectContent>
            </Select>
            
            <Button 
              className="bg-gradient-to-r from-indigo-600 to-indigo-500 text-white px-6 py-2 rounded-lg hover:from-indigo-700 hover:to-indigo-600 transition-all shadow-md hover:shadow-lg"
              onClick={() => navigate("/login")}
            >
              Login
            </Button>
          </div>
        </nav>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Hero Section with animated gradient text */}
          <div className="py-16 px-4 sm:px-6 lg:px-8 text-center">
            <motion.h1 
              className="text-5xl font-bold mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <span className="bg-gradient-to-r from-indigo-600 to-indigo-400 bg-clip-text text-transparent">
                Introduction to Unity Catalog Manager
              </span>
            </motion.h1>
            <motion.p 
              className="text-xl text-gray-600 max-w-3xl mx-auto"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              Efficiently manage users, groups, and permissions with intuitive controls.
            </motion.p>
          </div>

          {/* Features Grid with hover effects */}
          <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:px-8">
            <motion.h2 
              className="text-3xl font-semibold text-center mb-12 text-gray-800"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              Feature List
            </motion.h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((feature, index) => (
                <motion.div 
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
                  whileHover={{ 
                    scale: 1.03, 
                    boxShadow: "0 10px 25px -5px rgba(99, 102, 241, 0.2)",
                    transition: { duration: 0.3 }
                  }}
                  onMouseEnter={() => setHoveredFeature(index)}
                  onMouseLeave={() => setHoveredFeature(null)}
                  className="relative bg-white/90 backdrop-blur-sm p-6 rounded-xl border border-indigo-50 shadow-sm hover:border-indigo-100 transition-all duration-300 flex flex-col items-center text-center cursor-pointer h-full"
                >
                  {/* Animated highlight on hover */}
                  {hoveredFeature === index && (
                    <motion.div 
                      className="absolute inset-0 rounded-xl bg-gradient-to-br from-indigo-50/50 to-indigo-100/20"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3 }}
                    />
                  )}
                  <div className="relative z-10 bg-indigo-100 p-4 rounded-full mb-4 transition-all duration-300 group-hover:bg-indigo-200">
                    <feature.icon className="text-indigo-600 text-4xl transition-all duration-300 group-hover:text-indigo-700" />
                  </div>
                  <h3 className="relative z-10 font-semibold text-xl mb-2 text-gray-800">{feature.title}</h3>
                  <p className="relative z-10 text-gray-600">{feature.description}</p>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Stats/Call to Action Section */}
          <motion.div 
            className="py-16 px-4 sm:px-6 lg:px-8 bg-white/90 backdrop-blur-sm mt-16 rounded-xl mx-4 sm:mx-6 lg:mx-8 border border-indigo-50 shadow-sm"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
          >
            <div className="max-w-7xl mx-auto">
              <div className="text-center">
                <h2 className="text-3xl font-bold text-gray-900 mb-8">
                  <span className="bg-gradient-to-r from-indigo-600 to-indigo-400 bg-clip-text text-transparent">
                    Ready to get started?
                  </span>
                </h2>
                <div className="flex flex-wrap justify-center gap-6 mb-10">
                  {[
                    { value: "50+", label: "Active Users" },
                    { value: "10+", label: "Groups" },
                    { value: "100%", label: "Secure" }
                  ].map((stat, index) => (
                    <motion.div
                      key={index}
                      whileHover={{ y: -5 }}
                      className="bg-white p-6 rounded-lg border border-indigo-50 shadow-sm min-w-[200px]"
                    >
                      <p className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-indigo-400 bg-clip-text text-transparent">
                        {stat.value}
                      </p>
                      <p className="text-gray-600 mt-2">{stat.label}</p>
                    </motion.div>
                  ))}
                </div>
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button 
                    className="bg-gradient-to-r from-indigo-600 to-indigo-500 text-white px-8 py-4 text-lg rounded-lg hover:from-indigo-700 hover:to-indigo-600 transition-all shadow-md hover:shadow-lg"
                    onClick={() => navigate("/login")}
                  >
                    Login to Get Started
                  </Button>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}