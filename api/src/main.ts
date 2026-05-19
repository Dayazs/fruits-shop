import app from './app'

const PORT = process.env.PORT || 10040

app.listen(PORT, () => {
  console.log(`服务启动成功: http://localhost:${PORT}`)
})