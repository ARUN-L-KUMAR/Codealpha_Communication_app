console.log('Testing basic Node.js...')

const express = require('express')
console.log('Express loaded successfully')

const app = express()
console.log('Express app created')

app.get('/', (req, res) => {
  res.send('Hello from ConnectPro!')
})

const PORT = 5000

app.listen(PORT, () => {
  console.log(`Basic server running on http://localhost:${PORT}`)
})

console.log('Server setup complete')
