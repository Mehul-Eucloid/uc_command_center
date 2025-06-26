import { createWorkspaceUser } from '../services/databricks';

export const createUser = async (req, res) => {
  try {
    const { email, displayName } = req.body;
    const userId = await createWorkspaceUser(email, displayName);
    res.status(201).json({ id: userId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};  