export const validateRoomCreation = (req, res, next) => {
  const { name } = req.body;
  if (!name || typeof name !== 'string' || name.trim() === '') {
    return res.status(400).json({ error: 'Room name is required' });
  }
  next();
};

export const validateJoinRoom = (req, res, next) => {
  const { username } = req.body;
  if (!username || typeof username !== 'string' || username.trim() === '') {
    return res.status(400).json({ error: 'Username is required' });
  }
  next();
};

export const validateExecution = (req, res, next) => {
  const { code, language } = req.body;
  
  if (code === undefined || code === null) {
    return res.status(400).json({ error: 'Code is required' });
  }
  
  if (!language || typeof language !== 'string') {
    return res.status(400).json({ error: 'Language is required' });
  }
  
  next();
};
