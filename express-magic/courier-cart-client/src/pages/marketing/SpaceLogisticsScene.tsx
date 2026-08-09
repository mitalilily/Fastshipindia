import { useEffect, useRef } from 'react'
import * as THREE from 'three'

type MovingAsset = {
  curve: THREE.CatmullRomCurve3
  object: THREE.Group
  offset: number
  speed: number
  lift?: number
}

const BRAND_NAVY = 0x082b5c
const BRAND_RED = 0xe91d2b
const BRAND_WHITE = 0xf8fbff

const materials = {
  navy: new THREE.MeshStandardMaterial({ color: BRAND_NAVY, roughness: 0.4, metalness: 0.24 }),
  red: new THREE.MeshStandardMaterial({ color: BRAND_RED, roughness: 0.4, metalness: 0.08 }),
  white: new THREE.MeshStandardMaterial({ color: BRAND_WHITE, roughness: 0.52 }),
  dark: new THREE.MeshStandardMaterial({ color: 0x020712, roughness: 0.84 }),
  glass: new THREE.MeshStandardMaterial({ color: 0x7ea2cb, roughness: 0.16, metalness: 0.62 }),
}

function createLiveryTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 1024
  canvas.height = 512
  const context = canvas.getContext('2d')
  if (!context) return new THREE.CanvasTexture(canvas)

  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.fillStyle = '#082b5c'
  context.font = '900 116px Arial'
  context.fillText('EXPRESS', 76, 236)
  context.fillStyle = '#e91d2b'
  context.fillText('MAGIC', 76, 370)
  context.fillRect(76, 410, 590, 18)
  context.beginPath()
  context.moveTo(760, 122)
  context.lineTo(916, 256)
  context.lineTo(760, 390)
  context.lineTo(810, 256)
  context.closePath()
  context.fill()

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 8
  return texture
}

function createTruck(liveryTexture: THREE.Texture) {
  const truck = new THREE.Group()
  const cargo = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.9, 0.88), materials.white)
  cargo.position.set(-0.38, 0.12, 0)
  truck.add(cargo)

  const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.74, 0.16, 0.9), materials.red)
  stripe.position.set(-0.38, 0.13, 0)
  truck.add(stripe)

  const cab = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.76, 0.86), materials.navy)
  cab.position.set(0.9, 0.01, 0)
  truck.add(cab)

  const windscreen = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.3, 0.62), materials.glass)
  windscreen.position.set(1.3, 0.12, 0)
  truck.add(windscreen)

  const liveryMaterial = new THREE.MeshBasicMaterial({ map: liveryTexture, side: THREE.DoubleSide })
  const nearLivery = new THREE.Mesh(new THREE.PlaneGeometry(1.42, 0.64), liveryMaterial)
  nearLivery.position.set(-0.38, 0.18, 0.451)
  truck.add(nearLivery)
  const farLivery = nearLivery.clone()
  farLivery.position.z = -0.451
  farLivery.rotation.y = Math.PI
  truck.add(farLivery)

  ;[-0.84, 0.78].forEach((x) => {
    ;[-0.48, 0.48].forEach((z) => {
      const tyre = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.12, 18), materials.dark)
      tyre.position.set(x, -0.46, z)
      tyre.rotation.x = Math.PI / 2
      tyre.name = 'truck-wheel'
      truck.add(tyre)
    })
  })

  truck.scale.setScalar(0.72)
  return truck
}

function createPlane() {
  const plane = new THREE.Group()
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, 2.2, 20), materials.white)
  body.rotation.z = Math.PI / 2
  plane.add(body)

  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.48, 20), materials.red)
  nose.position.x = 1.32
  nose.rotation.z = -Math.PI / 2
  plane.add(nose)

  const wings = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.07, 1.85), materials.red)
  wings.rotation.y = -0.08
  plane.add(wings)

  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.58, 0.08), materials.navy)
  tail.position.set(-0.94, 0.28, 0)
  tail.rotation.z = -0.3
  plane.add(tail)

  plane.scale.setScalar(0.5)
  return plane
}

function createShip() {
  const ship = new THREE.Group()
  const hull = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.34, 0.76), materials.navy)
  ship.add(hull)

  const bow = new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.68, 4), materials.navy)
  bow.position.x = 1.38
  bow.rotation.z = -Math.PI / 2
  bow.rotation.y = Math.PI / 4
  ship.add(bow)

  ;[-0.65, -0.2, 0.25, 0.7].forEach((x, index) => {
    const container = new THREE.Mesh(
      new THREE.BoxGeometry(0.38, 0.4, 0.62),
      index % 2 === 0 ? materials.red : materials.white,
    )
    container.position.set(x, 0.36, 0)
    ship.add(container)
  })

  ship.scale.setScalar(0.46)
  return ship
}

function createHub() {
  const hub = new THREE.Group()
  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.55, 0.3, 8), materials.navy)
  hub.add(base)

  const warehouse = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.1, 1.5), materials.white)
  warehouse.position.y = 0.68
  hub.add(warehouse)

  const roof = new THREE.Mesh(new THREE.BoxGeometry(2.34, 0.16, 1.64), materials.red)
  roof.position.y = 1.3
  hub.add(roof)

  const door = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.72, 0.08), materials.navy)
  door.position.set(0, 0.56, 0.79)
  hub.add(door)

  ;[-0.72, 0.72].forEach((x) => {
    const window = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.3, 0.08), materials.glass)
    window.position.set(x, 0.82, 0.79)
    hub.add(window)
  })

  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 12), materials.red)
  beacon.position.set(0, 1.52, 0)
  hub.add(beacon)
  return hub
}

function createParcelStack() {
  const stack = new THREE.Group()
  const positions = [
    [-0.42, 0.18, 0],
    [0, 0.18, 0],
    [0.42, 0.18, 0],
    [-0.2, 0.55, 0],
    [0.22, 0.55, 0],
  ]
  positions.forEach(([x, y, z], index) => {
    const parcel = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.34, 0.34), index % 3 === 0 ? materials.red : materials.white)
    parcel.position.set(x, y, z)
    stack.add(parcel)
  })
  return stack
}

function createCityBuilding(width: number, height: number, depth: number, index: number) {
  const building = new THREE.Group()
  const shellMaterial = new THREE.MeshStandardMaterial({
    color: index % 3 === 0 ? 0x163c6b : index % 3 === 1 ? 0xd7e2ee : 0x0d2c55,
    roughness: 0.68,
    metalness: 0.14,
  })
  const shell = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), shellMaterial)
  shell.position.y = height / 2
  shell.castShadow = true
  shell.receiveShadow = true
  building.add(shell)

  const windowMaterial = new THREE.MeshBasicMaterial({ color: index % 2 === 0 ? 0xf7fbff : 0xe91d2b })
  const rows = Math.max(2, Math.floor(height / 0.55))
  for (let row = 0; row < rows; row += 1) {
    ;[-0.25, 0.25].forEach((offset) => {
      const window = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.16), windowMaterial)
      window.position.set(offset * width, 0.38 + row * 0.48, depth / 2 + 0.006)
      building.add(window)
    })
  }

  const roof = new THREE.Mesh(new THREE.BoxGeometry(width + 0.08, 0.08, depth + 0.08), materials.red)
  roof.position.y = height + 0.04
  building.add(roof)
  return building
}

export default function SpaceLogisticsScene() {
  const mountRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    const scene = new THREE.Scene()
    scene.fog = new THREE.FogExp2(0x030b18, 0.045)

    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100)
    camera.position.set(0, 3.4, 12)
    camera.lookAt(1.6, -0.35, 0)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75))
    renderer.setClearColor(0x030b18, 0)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    mount.appendChild(renderer.domElement)

    const liveryTexture = createLiveryTexture()

    const diorama = new THREE.Group()
    diorama.position.set(2.65, -0.65, 0)
    diorama.rotation.x = -0.08
    scene.add(diorama)

    const platform = new THREE.Mesh(
      new THREE.CylinderGeometry(4.25, 4.5, 0.35, 72),
      new THREE.MeshStandardMaterial({ color: 0x071a38, roughness: 0.72, metalness: 0.2 }),
    )
    platform.position.y = -0.45
    platform.receiveShadow = true
    diorama.add(platform)

    const platformRing = new THREE.Mesh(
      new THREE.TorusGeometry(3.55, 0.035, 8, 180),
      new THREE.MeshBasicMaterial({ color: BRAND_RED, transparent: true, opacity: 0.72 }),
    )
    platformRing.rotation.x = Math.PI / 2
    platformRing.position.y = -0.25
    diorama.add(platformRing)

    const grid = new THREE.GridHelper(7.3, 18, 0x31527b, 0x18375c)
    grid.position.y = -0.24
    diorama.add(grid)

    const hub = createHub()
    hub.position.set(0.3, -0.08, -0.35)
    hub.scale.setScalar(0.86)
    hub.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.castShadow = true
        object.receiveShadow = true
      }
    })
    diorama.add(hub)

    const parcelStack = createParcelStack()
    parcelStack.position.set(-1.75, -0.2, 0.82)
    parcelStack.rotation.y = -0.22
    diorama.add(parcelStack)

    const cityBlocks = [
      { x: -2.25, z: -1.42, width: 0.9, height: 2.15, depth: 0.9 },
      { x: -1.45, z: -2.15, width: 0.74, height: 1.5, depth: 0.72 },
      { x: 1.8, z: -2.1, width: 0.9, height: 2.45, depth: 0.84 },
      { x: 2.48, z: -0.98, width: 0.72, height: 1.6, depth: 0.7 },
      { x: 2.35, z: 1.25, width: 0.86, height: 2.05, depth: 0.82 },
      { x: 1.48, z: 2.08, width: 0.7, height: 1.42, depth: 0.68 },
      { x: -1.42, z: 2.2, width: 0.82, height: 1.82, depth: 0.76 },
      { x: -2.45, z: 1.25, width: 0.7, height: 1.34, depth: 0.7 },
    ]
    cityBlocks.forEach((block, index) => {
      const building = createCityBuilding(block.width, block.height, block.depth, index)
      building.position.set(block.x, -0.25, block.z)
      diorama.add(building)
    })

    const deliveryDrops: THREE.Group[] = []
    ;[
      [-2.7, 0.08, -1.85],
      [2.86, 0.08, -0.65],
      [1.82, 0.08, 2.58],
    ].forEach(([x, y, z], index) => {
      const drop = createParcelStack()
      drop.position.set(x, y, z)
      drop.scale.setScalar(0.56)
      drop.rotation.y = index * 0.72
      diorama.add(drop)
      deliveryDrops.push(drop)

      const beacon = new THREE.Mesh(
        new THREE.CylinderGeometry(0.035, 0.035, 0.9, 10),
        new THREE.MeshBasicMaterial({ color: BRAND_RED, transparent: true, opacity: 0.7 }),
      )
      beacon.position.set(x, y + 0.58, z)
      diorama.add(beacon)
    })

    const routeMaterial = new THREE.MeshBasicMaterial({ color: BRAND_RED, transparent: true, opacity: 0.9 })
    const truckRoute = new THREE.CatmullRomCurve3(
      [
        new THREE.Vector3(-3.15, -0.12, 1.45),
        new THREE.Vector3(-2.8, -0.12, -2.15),
        new THREE.Vector3(0.55, -0.12, -3.05),
        new THREE.Vector3(3.15, -0.12, -1.25),
        new THREE.Vector3(2.75, -0.12, 2.15),
        new THREE.Vector3(-0.4, -0.12, 3.0),
      ],
      true,
    )
    const road = new THREE.Mesh(new THREE.TubeGeometry(truckRoute, 150, 0.11, 8, true), materials.dark)
    diorama.add(road)
    const roadSignal = new THREE.Mesh(new THREE.TubeGeometry(truckRoute, 150, 0.018, 6, true), routeMaterial)
    roadSignal.position.y = 0.01
    diorama.add(roadSignal)

    const planeRoute = new THREE.CatmullRomCurve3(
      [
        new THREE.Vector3(-4.8, 2.7, -0.8),
        new THREE.Vector3(-1.2, 4.15, -1.7),
        new THREE.Vector3(2.8, 3.45, 0.1),
        new THREE.Vector3(5.2, 2.5, 1.3),
      ],
      true,
    )
    const airRoute = new THREE.Mesh(
      new THREE.TubeGeometry(planeRoute, 120, 0.012, 5, true),
      new THREE.MeshBasicMaterial({ color: BRAND_WHITE, transparent: true, opacity: 0.35 }),
    )
    diorama.add(airRoute)

    const shipRoute = new THREE.CatmullRomCurve3(
      [
        new THREE.Vector3(-4.4, 0.05, 3.5),
        new THREE.Vector3(-1.4, 0.05, 4.15),
        new THREE.Vector3(1.8, 0.05, 4.0),
        new THREE.Vector3(4.7, 0.05, 3.2),
      ],
      true,
    )

    const truck = createTruck(liveryTexture)
    const plane = createPlane()
    const ship = createShip()
    diorama.add(truck, plane, ship)

    const movingAssets: MovingAsset[] = [
      { curve: truckRoute, object: truck, offset: 0.08, speed: 0.027, lift: 0.42 },
      { curve: planeRoute, object: plane, offset: 0.3, speed: 0.022 },
      { curve: shipRoute, object: ship, offset: 0.62, speed: 0.018 },
    ]

    const hubRoutes = [
      [new THREE.Vector3(0.3, 1.45, -0.35), new THREE.Vector3(-2.2, 2.3, -1.1), new THREE.Vector3(-3.5, 0.3, -2.6)],
      [new THREE.Vector3(0.3, 1.45, -0.35), new THREE.Vector3(2.5, 2.55, 0.2), new THREE.Vector3(3.35, 0.1, 2.4)],
      [new THREE.Vector3(0.3, 1.45, -0.35), new THREE.Vector3(-1.1, 2.15, 1.8), new THREE.Vector3(-2.8, 0.15, 2.75)],
    ]
    hubRoutes.forEach((points) => {
      const curve = new THREE.CatmullRomCurve3(points)
      diorama.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 64, 0.012, 5, false), routeMaterial))
    })

    const starsGeometry = new THREE.BufferGeometry()
    const positions = new Float32Array(700 * 3)
    for (let i = 0; i < positions.length; i += 3) {
      positions[i] = (Math.random() - 0.5) * 30
      positions[i + 1] = (Math.random() - 0.5) * 18
      positions[i + 2] = (Math.random() - 0.5) * 18
    }
    starsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    const stars = new THREE.Points(
      starsGeometry,
      new THREE.PointsMaterial({ color: 0xb9cbe1, size: 0.018, transparent: true, opacity: 0.45 }),
    )
    scene.add(stars)

    scene.add(new THREE.HemisphereLight(0xdceaff, 0x06142e, 2.3))
    const keyLight = new THREE.DirectionalLight(0xffffff, 4.6)
    keyLight.position.set(-5, 8, 7)
    keyLight.castShadow = true
    scene.add(keyLight)
    const redLight = new THREE.PointLight(BRAND_RED, 34, 16)
    redLight.position.set(4, 1.5, 4)
    scene.add(redLight)

    const pointer = new THREE.Vector2()
    const onPointerMove = (event: PointerEvent) => {
      pointer.x = event.clientX / window.innerWidth - 0.5
      pointer.y = event.clientY / window.innerHeight - 0.5
    }
    window.addEventListener('pointermove', onPointerMove, { passive: true })

    const resize = () => {
      const { clientWidth, clientHeight } = mount
      renderer.setSize(clientWidth, clientHeight, false)
      camera.aspect = clientWidth / Math.max(clientHeight, 1)
      camera.updateProjectionMatrix()
      diorama.position.x = clientWidth < 820 ? 0.4 : 2.65
      diorama.position.y = clientWidth < 820 ? -2.15 : -0.65
      diorama.scale.setScalar(clientWidth < 540 ? 0.64 : clientWidth < 820 ? 0.78 : 1)
    }
    resize()
    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(mount)

    const clock = new THREE.Clock()
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let animationFrame = 0
    const animate = () => {
      const elapsed = clock.getElapsedTime()
      diorama.rotation.y += (pointer.x * 0.16 - diorama.rotation.y) * 0.025
      diorama.rotation.x += (-0.08 + pointer.y * 0.08 - diorama.rotation.x) * 0.025
      stars.rotation.y = elapsed * 0.004
      redLight.intensity = 31 + Math.sin(elapsed * 1.8) * 5

      truck.traverse((object) => {
        if (object.name === 'truck-wheel') object.rotation.z -= reducedMotion ? 0 : 0.09
      })

      deliveryDrops.forEach((drop, index) => {
        const pulse = reducedMotion ? 0 : Math.sin(elapsed * 2.2 + index * 1.4)
        const scale = 0.56 + Math.max(0, pulse) * 0.035
        drop.scale.setScalar(scale)
        drop.position.y = 0.08 + Math.max(0, pulse) * 0.045
      })

      movingAssets.forEach(({ curve, object, offset, speed, lift = 0 }) => {
        const progress = reducedMotion ? offset : (elapsed * speed + offset) % 1
        const point = curve.getPointAt(progress)
        const nextPoint = curve.getPointAt((progress + 0.002) % 1)
        object.position.copy(point)
        object.position.y += lift
        const tangent = nextPoint.sub(point)
        object.rotation.y = -Math.atan2(tangent.z, tangent.x)
      })

      renderer.render(scene, camera)
      animationFrame = window.requestAnimationFrame(animate)
    }
    animate()

    return () => {
      window.cancelAnimationFrame(animationFrame)
      window.removeEventListener('pointermove', onPointerMove)
      resizeObserver.disconnect()
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Points) {
          object.geometry.dispose()
          const material = object.material
          if (Array.isArray(material)) material.forEach((item) => item.dispose())
          else material.dispose()
        }
      })
      renderer.dispose()
      liveryTexture.dispose()
      renderer.domElement.remove()
    }
  }, [])

  return <div className="em-space-scene" ref={mountRef} aria-hidden="true" />
}
