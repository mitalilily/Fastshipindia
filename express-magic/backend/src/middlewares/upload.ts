import multer from 'multer'

const storage = multer.memoryStorage() // store file in memory
export const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 1,
  },
})
