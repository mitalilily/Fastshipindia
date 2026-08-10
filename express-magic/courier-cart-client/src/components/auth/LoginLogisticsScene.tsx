import { Check, MapPin, PackageCheck, Truck } from 'lucide-react'
import styles from './LoginLogisticsScene.module.css'

export default function LoginLogisticsScene() {
  return (
    <div
      className={styles.scene}
      role="img"
      aria-label="Animated FastShip delivery network with a parcel, route map, and moving courier"
    >
      <div className={styles.ambientGlow} />
      <div className={styles.networkPlane}>
        <span className={`${styles.hub} ${styles.hubOne}`} />
        <span className={`${styles.hub} ${styles.hubTwo}`} />
        <span className={`${styles.hub} ${styles.hubThree}`} />
        <svg className={styles.routes} viewBox="0 0 420 250" aria-hidden="true">
          <path d="M35 178 C108 104 161 219 228 134 S342 70 396 115" />
          <path d="M44 75 C122 126 170 34 251 84 S345 197 394 164" />
        </svg>
      </div>

      <div className={styles.globe} aria-hidden="true">
        <span className={styles.globeLatitude} />
        <span className={styles.globeLongitude} />
        <span className={styles.globePulse} />
        <MapPin className={styles.globePin} size={18} strokeWidth={2.6} />
      </div>

      <div className={styles.parcelStage} aria-hidden="true">
        <div className={styles.parcelCube}>
          <div className={`${styles.cubeFace} ${styles.cubeFront}`}>
            <PackageCheck size={32} strokeWidth={2.1} />
            <span>FASTSHIP</span>
            <small>EXPRESS</small>
          </div>
          <div className={`${styles.cubeFace} ${styles.cubeSide}`}>
            <span />
          </div>
          <div className={`${styles.cubeFace} ${styles.cubeTop}`}>
            <i />
          </div>
        </div>
        <div className={styles.parcelShadow} />
      </div>

      <div className={styles.truckTrack} aria-hidden="true">
        <span className={styles.truckTrail} />
        <span className={styles.truckBadge}>
          <Truck size={22} strokeWidth={2.3} />
        </span>
      </div>

      <div className={`${styles.infoCard} ${styles.liveCard}`}>
        <span className={styles.liveDot} />
        <div>
          <small>NETWORK</small>
          <strong>Live routes</strong>
        </div>
      </div>

      <div className={`${styles.infoCard} ${styles.deliveryCard}`}>
        <span className={styles.checkIcon}>
          <Check size={14} strokeWidth={3} />
        </span>
        <div>
          <small>DELIVERY</small>
          <strong>On schedule</strong>
        </div>
      </div>

      <div className={styles.metricCard}>
        <strong>29K+</strong>
        <span>serviceable pin codes</span>
      </div>
    </div>
  )
}
