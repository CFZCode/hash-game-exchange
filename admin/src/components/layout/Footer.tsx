import { siteConfig } from '@/configs/site'

const Footer = () => {
  return (
    <footer className='border-border border-t'>
      <div className='text-muted-foreground mx-auto flex size-full max-w-360 items-center justify-between gap-2 px-4 py-4 text-xs max-sm:flex-col sm:gap-6 sm:px-6'>
        <p>
          ©{new Date().getFullYear()} {siteConfig.name}
        </p>
      </div>
    </footer>
  )
}

export default Footer
