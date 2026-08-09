import { Box } from '@mui/material'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { BRAND } from '../../config/brand'

const { teal, orange, paper } = BRAND.colors

function createParcel(width: number, height: number, depth: number, x: number, y: number, z: number) {
  const parcel = new THREE.Group()
  const box = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    new THREE.MeshStandardMaterial({ color: '#D69A54', roughness: 0.72, metalness: 0.02 }),
  )
  const tape = new THREE.Mesh(
    new THREE.BoxGeometry(width * 0.16, height + 0.012, depth + 0.012),
    new THREE.MeshStandardMaterial({ color: '#B87534', roughness: 0.78 }),
  )

  box.castShadow = true
  box.receiveShadow = true
  tape.castShadow = true
  parcel.add(box, tape)
  parcel.position.set(x, y, z)
  return parcel
}

function createTruck() {
  const truck = new THREE.Group()
  const cargo = new THREE.Mesh(
    new THREE.BoxGeometry(2.35, 1.25, 1.18),
    new THREE.MeshStandardMaterial({ color: teal, roughness: 0.42, metalness: 0.04 }),
  )
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(1.02, 1.05, 1.12),
    new THREE.MeshStandardMaterial({ color: paper, roughness: 0.36, metalness: 0.02 }),
  )
  const windshield = new THREE.Mesh(
    new THREE.BoxGeometry(0.42, 0.38, 1.14),
    new THREE.MeshStandardMaterial({ color: '#8FB6D8', roughness: 0.18, metalness: 0.08 }),
  )
  const stripe = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 1.28, 1.2),
    new THREE.MeshStandardMaterial({ color: orange, roughness: 0.38 }),
  )
  const wheelMaterial = new THREE.MeshStandardMaterial({ color: '#0B1627', roughness: 0.5 })

  cargo.position.set(-0.66, 0.88, 0)
  cabin.position.set(1.08, 0.78, 0)
  windshield.position.set(1.46, 0.94, 0)
  stripe.position.set(0.38, 0.9, 0)
  truck.add(cargo, cabin, windshield, stripe)

  ;[-1.45, 0.95].forEach((x) => {
    ;[-0.63, 0.63].forEach((z) => {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.18, 24), wheelMaterial)
      wheel.rotation.x = Math.PI / 2
      wheel.position.set(x, 0.18, z)
      wheel.castShadow = true
      truck.add(wheel)
    })
  })

  truck.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true
      child.receiveShadow = true
    }
  })

  truck.rotation.y = -0.36
  truck.position.set(0.2, 0.02, 0.25)
  return truck
}

type LogisticsThreeSceneProps = {
  compact?: boolean
}

export default function LogisticsThreeScene({ compact = false }: LogisticsThreeSceneProps) {
  const mountRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100)
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    const clock = new THREE.Clock()
    const routeDots: THREE.Mesh[] = []

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    mount.appendChild(renderer.domElement)

    camera.position.set(compact ? 4.35 : 4.8, compact ? 3 : 3.25, compact ? 6.4 : 6.2)
    camera.lookAt(0, 0.75, 0)

    scene.add(new THREE.HemisphereLight('#F7FBFF', '#9BB0C9', 2.8))
    const keyLight = new THREE.DirectionalLight('#ffffff', 2.3)
    keyLight.position.set(3.5, 5, 4)
    keyLight.castShadow = true
    keyLight.shadow.mapSize.set(1024, 1024)
    scene.add(keyLight)

    const stage = new THREE.Group()
    if (compact) {
      stage.scale.setScalar(0.78)
      stage.position.y = -0.28
    }
    scene.add(stage)

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(3.9, 80),
      new THREE.MeshStandardMaterial({ color: '#F4F8FC', roughness: 0.82, metalness: 0.01 }),
    )
    floor.rotation.x = -Math.PI / 2
    floor.position.y = -0.02
    floor.receiveShadow = true
    stage.add(floor)

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(3.1, 0.012, 10, 120),
      new THREE.MeshBasicMaterial({ color: teal, transparent: true, opacity: 0.22 }),
    )
    ring.rotation.x = Math.PI / 2
    ring.position.y = 0.02
    stage.add(ring)

    const truck = createTruck()
    stage.add(truck)

    const parcels = new THREE.Group()
    parcels.add(createParcel(0.72, 0.48, 0.58, -1.9, 0.24, -0.62))
    parcels.add(createParcel(0.62, 0.42, 0.56, -2.34, 0.2, 0.08))
    parcels.add(createParcel(0.58, 0.38, 0.5, -1.72, 0.19, 0.18))
    parcels.add(createParcel(0.5, 0.34, 0.48, -2.06, 0.68, -0.24))
    stage.add(parcels)

    const routeCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-2.8, 0.06, 1.35),
      new THREE.Vector3(-1.5, 0.1, 2.15),
      new THREE.Vector3(0.15, 0.08, 1.82),
      new THREE.Vector3(1.65, 0.1, 1.18),
      new THREE.Vector3(2.7, 0.06, 0.08),
    ])
    const route = new THREE.Mesh(
      new THREE.TubeGeometry(routeCurve, 90, 0.018, 8, false),
      new THREE.MeshBasicMaterial({ color: orange, transparent: true, opacity: 0.68 }),
    )
    stage.add(route)

    for (let index = 0; index < 5; index += 1) {
      const dot = new THREE.Mesh(
        new THREE.SphereGeometry(0.055, 16, 16),
        new THREE.MeshStandardMaterial({ color: index % 2 ? orange : teal, roughness: 0.25 }),
      )
      dot.userData.offset = index / 5
      dot.castShadow = true
      routeDots.push(dot)
      stage.add(dot)
    }

    const pinMaterial = new THREE.MeshStandardMaterial({ color: orange, roughness: 0.38 })
    ;[
      new THREE.Vector3(-2.8, 0.24, 1.35),
      new THREE.Vector3(2.7, 0.24, 0.08),
    ].forEach((position) => {
      const pin = new THREE.Group()
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 24, 24), pinMaterial)
      const stem = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.34, 18), pinMaterial)
      stem.position.y = -0.22
      pin.add(head, stem)
      pin.position.copy(position)
      pin.castShadow = true
      stage.add(pin)
    })

    const resize = () => {
      const { clientWidth, clientHeight } = mount
      renderer.setSize(clientWidth, clientHeight, false)
      camera.aspect = clientWidth / Math.max(clientHeight, 1)
      camera.updateProjectionMatrix()
    }

    const observer = new ResizeObserver(resize)
    observer.observe(mount)
    resize()

    let frameId = 0
    const render = () => {
      const elapsed = clock.getElapsedTime()
      stage.rotation.y = Math.sin(elapsed * 0.26) * 0.12
      truck.position.y = Math.sin(elapsed * 1.65) * 0.045
      parcels.rotation.y = Math.sin(elapsed * 0.72) * 0.08
      ring.rotation.z = elapsed * 0.12

      routeDots.forEach((dot) => {
        const point = routeCurve.getPoint((elapsed * 0.12 + dot.userData.offset) % 1)
        dot.position.copy(point)
        dot.position.y += 0.08 + Math.sin(elapsed * 2 + dot.userData.offset * 10) * 0.025
      })

      renderer.render(scene, camera)
      frameId = window.requestAnimationFrame(render)
    }

    render()

    return () => {
      window.cancelAnimationFrame(frameId)
      observer.disconnect()
      renderer.dispose()
      renderer.domElement.remove()
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose()
          const materials = Array.isArray(object.material) ? object.material : [object.material]
          materials.forEach((material) => material.dispose())
        }
      })
    }
  }, [compact])

  return (
    <Box
      ref={mountRef}
      aria-hidden="true"
      sx={{
        position: 'absolute',
        inset: compact ? 0 : { md: '-22px -78px -8px -78px', lg: '-30px -104px -10px -104px' },
        zIndex: 2,
        pointerEvents: 'none',
        '& canvas': {
          display: 'block',
          width: '100%',
          height: '100%',
          filter: 'drop-shadow(0 26px 34px rgba(6, 26, 51, 0.12))',
        },
      }}
    />
  )
}
