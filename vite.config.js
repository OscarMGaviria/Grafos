import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default defineConfig({
  plugins: [
    vue(),
    {
      name: 'geojson-api',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url === '/api/geojson' && req.method === 'GET') {
            const geojsonPath = path.resolve(__dirname, 'red_vial_antioquia.geojson')
            if (!fs.existsSync(geojsonPath)) {
              res.statusCode = 404
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: 'File not found' }))
              return
            }
            const data = fs.readFileSync(geojsonPath, 'utf8')
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.end(data)
          } else if (req.url === '/api/geojson' && req.method === 'POST') {
            let body = ''
            req.on('data', chunk => {
              body += chunk.toString()
            })
            req.on('end', () => {
              try {
                const geojsonPath = path.resolve(__dirname, 'red_vial_antioquia.geojson')
                const parsed = JSON.parse(body)
                // Write back nicely formatted GeoJSON
                fs.writeFileSync(geojsonPath, JSON.stringify(parsed, null, 2), 'utf8')
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ success: true }))
              } catch (error) {
                res.statusCode = 400
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ error: 'Invalid JSON format or write error: ' + error.message }))
              }
            })
          } else {
            next()
          }
        })
      }
    }
  ]
})
