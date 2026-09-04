import Image from 'next/image'
import repCadenceIcon from '@/app/icon.png'

export function BrandMark({
  size = 40,
  className,
}: {
  size?: number
  className?: string
}) {
  return (
    <Image
      src={repCadenceIcon}
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      className={className}
    />
  )
}
