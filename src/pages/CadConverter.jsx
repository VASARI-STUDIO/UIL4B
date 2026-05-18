import { useState, useCallback, useRef, useEffect } from 'react'
import { useI18n } from '../contexts/I18nContext'
import DxfParser from 'dxf-parser'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { OBJExporter } from 'three/addons/exporters/OBJExporter.js'

function buildThreeScene(dxf) {
  const group = new THREE.Group()
  if (!dxf?.entities) return group

  const materialCache = {}
  function getMaterial(colorIndex) {
    const key = colorIndex || 7
    if (materialCache[key]) return materialCache[key]
    const aciColors = {
      1: 0xff0000, 2: 0xffff00, 3: 0x00ff00, 4: 0x00ffff,
      5: 0x0000ff, 6: 0xff00ff, 7: 0xffffff, 8: 0x808080, 9: 0xc0c0c0,
    }
    const color = aciColors[key] || 0xaaaaaa
    const mat = new THREE.LineBasicMaterial({ color })
    materialCache[key] = mat
    return mat
  }

  for (const entity of dxf.entities) {
    const mat = getMaterial(entity.colorIndex)

    if (entity.type === 'LINE') {
      const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(entity.vertices[0].x, entity.vertices[0].y, entity.vertices[0].z || 0),
        new THREE.Vector3(entity.vertices[1].x, entity.vertices[1].y, entity.vertices[1].z || 0),
      ])
      group.add(new THREE.Line(geo, mat))
    }

    if (entity.type === 'POLYLINE' || entity.type === 'LWPOLYLINE') {
      const pts = (entity.vertices || []).map(v => new THREE.Vector3(v.x, v.y, v.z || 0))
      if (pts.length > 1) {
        if (entity.shape) pts.push(pts[0].clone())
        const geo = new THREE.BufferGeometry().setFromPoints(pts)
        group.add(new THREE.Line(geo, mat))
      }
    }

    if (entity.type === 'CIRCLE') {
      const curve = new THREE.EllipseCurve(entity.center.x, entity.center.y, entity.radius, entity.radius, 0, Math.PI * 2, false, 0)
      const pts = curve.getPoints(64)
      const geo = new THREE.BufferGeometry().setFromPoints(pts.map(p => new THREE.Vector3(p.x, p.y, entity.center.z || 0)))
      group.add(new THREE.Line(geo, mat))
    }

    if (entity.type === 'ARC') {
      const startAngle = (entity.startAngle || 0) * Math.PI / 180
      const endAngle = (entity.endAngle || 360) * Math.PI / 180
      const curve = new THREE.EllipseCurve(entity.center.x, entity.center.y, entity.radius, entity.radius, startAngle, endAngle, false, 0)
      const pts = curve.getPoints(64)
      const geo = new THREE.BufferGeometry().setFromPoints(pts.map(p => new THREE.Vector3(p.x, p.y, entity.center.z || 0)))
      group.add(new THREE.Line(geo, mat))
    }

    if (entity.type === 'ELLIPSE') {
      const major = new THREE.Vector3(entity.majorAxisEndPoint.x, entity.majorAxisEndPoint.y, entity.majorAxisEndPoint.z || 0)
      const rx = major.length()
      const ry = rx * (entity.axisRatio || 1)
      const rot = Math.atan2(major.y, major.x)
      const curve = new THREE.EllipseCurve(entity.center.x, entity.center.y, rx, ry, entity.startAngle || 0, entity.endAngle || Math.PI * 2, false, rot)
      const pts = curve.getPoints(64)
      const geo = new THREE.BufferGeometry().setFromPoints(pts.map(p => new THREE.Vector3(p.x, p.y, entity.center.z || 0)))
      group.add(new THREE.Line(geo, mat))
    }

    if (entity.type === 'SPLINE') {
      const pts = (entity.controlPoints || []).map(v => new THREE.Vector3(v.x, v.y, v.z || 0))
      if (pts.length >= 2) {
        let curve
        if (pts.length === 2) {
          curve = new THREE.LineCurve3(pts[0], pts[1])
        } else if (pts.length === 3) {
          curve = new THREE.QuadraticBezierCurve3(pts[0], pts[1], pts[2])
        } else {
          curve = new THREE.CatmullRomCurve3(pts)
        }
        const geo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(100))
        group.add(new THREE.Line(geo, mat))
      }
    }

    if (entity.type === '3DFACE') {
      const verts = entity.vertices || []
      if (verts.length >= 3) {
        const geo = new THREE.BufferGeometry()
        const positions = []
        positions.push(verts[0].x, verts[0].y, verts[0].z || 0)
        positions.push(verts[1].x, verts[1].y, verts[1].z || 0)
        positions.push(verts[2].x, verts[2].y, verts[2].z || 0)
        if (verts.length >= 4) {
          positions.push(verts[0].x, verts[0].y, verts[0].z || 0)
          positions.push(verts[2].x, verts[2].y, verts[2].z || 0)
          positions.push(verts[3].x, verts[3].y, verts[3].z || 0)
        }
        geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
        geo.computeVertexNormals()
        const meshMat = new THREE.MeshStandardMaterial({ color: mat.color, side: THREE.DoubleSide, flatShading: true })
        group.add(new THREE.Mesh(geo, meshMat))
      }
    }

    if (entity.type === 'POINT') {
      const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(entity.position.x, entity.position.y, entity.position.z || 0)
      ])
      const pointMat = new THREE.PointsMaterial({ color: mat.color, size: 3, sizeAttenuation: false })
      group.add(new THREE.Points(geo, pointMat))
    }
  }

  return group
}

function exportToObj(scene) {
  const exporter = new OBJExporter()
  return exporter.parse(scene)
}

function exportToDxfText(dxf) {
  if (!dxf?.entities) return ''
  let out = '0\nSECTION\n2\nENTITIES\n'
  for (const e of dxf.entities) {
    if (e.type === 'LINE' && e.vertices?.length >= 2) {
      out += `0\nLINE\n8\n${e.layer || '0'}\n`
      out += `10\n${e.vertices[0].x}\n20\n${e.vertices[0].y}\n30\n${e.vertices[0].z || 0}\n`
      out += `11\n${e.vertices[1].x}\n21\n${e.vertices[1].y}\n31\n${e.vertices[1].z || 0}\n`
    }
    if ((e.type === 'POLYLINE' || e.type === 'LWPOLYLINE') && e.vertices?.length) {
      out += `0\nLWPOLYLINE\n8\n${e.layer || '0'}\n90\n${e.vertices.length}\n`
      if (e.shape) out += '70\n1\n'
      for (const v of e.vertices) {
        out += `10\n${v.x}\n20\n${v.y}\n`
      }
    }
    if (e.type === 'CIRCLE') {
      out += `0\nCIRCLE\n8\n${e.layer || '0'}\n10\n${e.center.x}\n20\n${e.center.y}\n30\n${e.center.z || 0}\n40\n${e.radius}\n`
    }
    if (e.type === 'ARC') {
      out += `0\nARC\n8\n${e.layer || '0'}\n10\n${e.center.x}\n20\n${e.center.y}\n30\n${e.center.z || 0}\n40\n${e.radius}\n50\n${e.startAngle || 0}\n51\n${e.endAngle || 360}\n`
    }
  }
  out += '0\nENDSEC\n0\nEOF\n'
  return out
}

function downloadBlob(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export default function CadConverter({ toast }) {
  const { t } = useI18n()
  const [file, setFile] = useState(null)
  const [fileName, setFileName] = useState('')
  const [dxf, setDxf] = useState(null)
  const [error, setError] = useState('')
  const [stats, setStats] = useState(null)
  const [exportFormat, setExportFormat] = useState('obj')
  const [dragOver, setDragOver] = useState(false)
  const canvasRef = useRef(null)
  const sceneRef = useRef(null)
  const rendererRef = useRef(null)
  const animRef = useRef(null)

  const handleFile = useCallback((f) => {
    if (!f) return
    const ext = f.name.split('.').pop().toLowerCase()
    if (ext !== 'dxf') {
      setError('Only DXF files are supported. DWG support requires a server-side converter — upload a DXF export from your CAD software.')
      return
    }
    setError('')
    setFileName(f.name)
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const parser = new DxfParser()
        const parsed = parser.parseSync(e.target.result)
        if (!parsed) throw new Error('Failed to parse DXF')
        setDxf(parsed)
        setFile(f)

        const entityTypes = {}
        const layers = new Set()
        for (const ent of parsed.entities || []) {
          entityTypes[ent.type] = (entityTypes[ent.type] || 0) + 1
          if (ent.layer) layers.add(ent.layer)
        }
        setStats({
          entities: parsed.entities?.length || 0,
          types: entityTypes,
          layers: [...layers],
          hasBlocks: Object.keys(parsed.blocks || {}).length > 0,
          blockCount: Object.keys(parsed.blocks || {}).length,
        })
      } catch (err) {
        setError(`Parse error: ${err.message}`)
        setDxf(null)
        setStats(null)
      }
    }
    reader.readAsText(f)
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer?.files?.[0]
    if (f) handleFile(f)
  }, [handleFile])

  useEffect(() => {
    if (!dxf || !canvasRef.current) return
    const canvas = canvasRef.current
    const container = canvas.parentElement

    if (rendererRef.current) {
      cancelAnimationFrame(animRef.current)
      rendererRef.current.dispose()
    }

    const w = container.clientWidth
    const h = container.clientHeight || 400
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
    renderer.setSize(w, h)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0x0c0e16, 1)
    rendererRef.current = renderer

    const scene = new THREE.Scene()
    const group = buildThreeScene(dxf)
    scene.add(group)
    sceneRef.current = scene

    scene.add(new THREE.AmbientLight(0xffffff, 0.6))
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8)
    dirLight.position.set(5, 10, 7)
    scene.add(dirLight)

    const box = new THREE.Box3().setFromObject(group)
    const center = box.getCenter(new THREE.Vector3())
    const size = box.getSize(new THREE.Vector3())
    const maxDim = Math.max(size.x, size.y, size.z) || 10
    const camera = new THREE.PerspectiveCamera(50, w / h, maxDim * 0.001, maxDim * 100)
    camera.position.set(center.x + maxDim, center.y + maxDim * 0.5, center.z + maxDim)
    camera.lookAt(center)

    const controls = new OrbitControls(camera, canvas)
    controls.target.copy(center)
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.update()

    const grid = new THREE.GridHelper(maxDim * 2, 20, 0x2a2f3f, 0x1f2330)
    grid.position.y = box.min.y
    scene.add(grid)

    function animate() {
      animRef.current = requestAnimationFrame(animate)
      controls.update()
      renderer.render(scene, camera)
    }
    animate()

    const onResize = () => {
      const nw = container.clientWidth
      const nh = container.clientHeight || 400
      camera.aspect = nw / nh
      camera.updateProjectionMatrix()
      renderer.setSize(nw, nh)
    }
    window.addEventListener('resize', onResize)

    return () => {
      window.removeEventListener('resize', onResize)
      cancelAnimationFrame(animRef.current)
      renderer.dispose()
    }
  }, [dxf])

  const handleExport = useCallback(() => {
    if (!dxf) return
    const baseName = fileName.replace(/\.[^.]+$/, '')
    if (exportFormat === 'obj') {
      if (!sceneRef.current) return
      const obj = exportToObj(sceneRef.current)
      downloadBlob(obj, `${baseName}.obj`, 'text/plain')
      toast('Exported OBJ')
    } else if (exportFormat === 'dxf') {
      const dxfText = exportToDxfText(dxf)
      downloadBlob(dxfText, `${baseName}_clean.dxf`, 'text/plain')
      toast('Exported clean DXF')
    }
  }, [dxf, fileName, exportFormat, toast])

  const reset = useCallback(() => {
    setFile(null)
    setFileName('')
    setDxf(null)
    setError('')
    setStats(null)
    if (rendererRef.current) {
      cancelAnimationFrame(animRef.current)
      rendererRef.current.dispose()
      rendererRef.current = null
    }
  }, [])

  return (
    <div className="sec">
      <div className="sec-h">
        <div className="sec-h-eyebrow">3D Tools</div>
        <h1>CAD <em>Converter</em></h1>
        <p>Convert DXF files to OBJ for Blender, preview 3D geometry, and export clean files — all in your browser.</p>
      </div>

      {!dxf ? (
        <div
          className={`cad-drop${dragOver ? ' over' : ''}${error ? ' error' : ''}`}
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => document.getElementById('cad-file-input')?.click()}
        >
          <input
            id="cad-file-input"
            type="file"
            accept=".dxf,.dwg"
            style={{ display: 'none' }}
            onChange={e => handleFile(e.target.files?.[0])}
          />
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <path d="M12 18v-6" /><path d="M9 15l3-3 3 3" />
          </svg>
          <div className="cad-drop-text">
            <strong>Drop a DXF file here</strong>
            <span>or click to browse</span>
          </div>
          <div className="cad-drop-formats">
            <span className="cad-fmt">.DXF</span>
            <span className="cad-fmt dim">.DWG (coming soon)</span>
          </div>
          {error && <div className="cad-error">{error}</div>}
        </div>
      ) : (
        <>
          {/* Toolbar */}
          <div className="cad-toolbar">
            <div className="cad-file-info">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              <span className="cad-file-name">{fileName}</span>
              <span className="cad-file-entities">{stats?.entities || 0} entities</span>
            </div>
            <div className="cad-actions">
              <select value={exportFormat} onChange={e => setExportFormat(e.target.value)} className="cad-select">
                <option value="obj">OBJ (Blender)</option>
                <option value="dxf">Clean DXF</option>
              </select>
              <button className="btn btn-accent" onClick={handleExport}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Export
              </button>
              <button className="btn" onClick={reset}>New File</button>
            </div>
          </div>

          {/* 3D Preview */}
          <div className="cad-preview">
            <canvas ref={canvasRef} />
            <div className="cad-preview-hint">Drag to rotate · Scroll to zoom · Right-click to pan</div>
          </div>

          {/* Stats */}
          {stats && (
            <div className="cad-stats">
              <div className="cad-stat-card">
                <div className="cad-stat-val">{stats.entities}</div>
                <div className="cad-stat-label">Entities</div>
              </div>
              <div className="cad-stat-card">
                <div className="cad-stat-val">{stats.layers.length}</div>
                <div className="cad-stat-label">Layers</div>
              </div>
              <div className="cad-stat-card">
                <div className="cad-stat-val">{Object.keys(stats.types).length}</div>
                <div className="cad-stat-label">Entity Types</div>
              </div>
              <div className="cad-stat-card">
                <div className="cad-stat-val">{stats.blockCount}</div>
                <div className="cad-stat-label">Blocks</div>
              </div>
            </div>
          )}

          {/* Entity type breakdown */}
          {stats && (
            <div className="sub" style={{ marginTop: 24 }}>
              <div className="sl">Entity Breakdown</div>
              <div className="cad-entity-list">
                {Object.entries(stats.types).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
                  <div key={type} className="cad-entity-row">
                    <span className="cad-entity-type">{type}</span>
                    <div className="cad-entity-bar">
                      <div style={{ width: `${Math.max(4, (count / stats.entities) * 100)}%` }} />
                    </div>
                    <span className="cad-entity-count">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Layers */}
          {stats && stats.layers.length > 0 && (
            <div className="sub" style={{ marginTop: 12 }}>
              <div className="sl">Layers</div>
              <div className="cad-layers">
                {stats.layers.map(layer => (
                  <span key={layer} className="cad-layer-chip">{layer}</span>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
