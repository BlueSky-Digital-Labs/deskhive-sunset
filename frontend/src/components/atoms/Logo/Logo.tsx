import logoSvg from '@/assets/images/deskhive-logo.svg'
import './Logo.css'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  className?: string
}

export const Logo = ({ size = 'lg', className = '' }: LogoProps) => {
  return (
    <div className={`logo logo--${size} ${className}`}>
      <img
        src={logoSvg}
        alt="DeskHive"
        className="logo-image"
      />
    </div>
  )
}
