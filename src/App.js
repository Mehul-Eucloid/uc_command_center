import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import UserList from './UserList.js';
import CreateUser from './create-user.js';
import CreateGroup from './create-group.js';
import Groups from './groups.js';
import Home from './home.js';
import HomeNoLogin from './homenologin.js';
import Login from './login.js';
import Catalog from './catalog.js';
import Schemas from './schemas.js';
import Grant from './grant.js';
import Migration from './migration.js';
import Tables from './tables.js';


function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomeNoLogin />} />
        <Route path="/login" element={<Login />} />
        <Route path="/users" element={<UserList />} />
        <Route path="/create-user" element={<CreateUser />} />
        <Route path="/create-group" element={<CreateGroup />} />
        <Route path="/groups" element={<Groups />} />
        <Route path="/home" element={<Home />} />
        <Route path="/catalog" element={<Catalog />} />
        <Route path="/schemas" element={<Schemas />} />
        <Route path="/grant" element={<Grant />} />
        <Route path="/migration" element={<Migration />} />
        <Route path="/tables" element={<Tables />} />
      </Routes>
    </Router>
  );
}

export default App;