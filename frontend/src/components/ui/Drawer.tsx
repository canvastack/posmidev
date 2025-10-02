import React, { Fragment } from 'react'
import { Dialog, Transition } from '@headlessui/react'

interface DrawerProps {
  open: boolean
  onClose: () => void
  side?: 'left' | 'right'
  widthClass?: string // e.g., 'w-64'
  children: React.ReactNode
  title?: string
}

export const Drawer: React.FC<DrawerProps> = ({ open, onClose, side = 'left', widthClass = 'w-72', children, title }) => {
  return (
    <Transition show={open} as={Fragment}>
      <Dialog as="div" className="relative z-[60]" onClose={onClose}>
        <Transition.Child as={Fragment} enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0">
          <div className="fixed inset-0 bg-black/40" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className={`pointer-events-none fixed inset-y-0 ${side === 'left' ? 'left-0' : 'right-0'} flex max-w-full`}>
              <Transition.Child
                as={Fragment}
                enter="transform transition ease-in-out duration-300"
                enterFrom={side === 'left' ? '-translate-x-full' : 'translate-x-full'}
                enterTo="translate-x-0"
                leave="transform transition ease-in-out duration-200"
                leaveFrom="translate-x-0"
                leaveTo={side === 'left' ? '-translate-x-full' : 'translate-x-full'}
              >
                <Dialog.Panel className={`pointer-events-auto ${widthClass} card h-full shadow-xl`}>
                  {title && <div className="px-4 py-3 border-b border-white/10 text-sm font-semibold">{title}</div>}
                  <div className="h-full overflow-y-auto p-2">{children}</div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}