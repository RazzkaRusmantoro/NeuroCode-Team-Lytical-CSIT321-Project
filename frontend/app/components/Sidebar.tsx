'use client';
import { useState, useMemo, useCallback, useEffect } from 'react';
import { signOut, useSession } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { useLoadingBar } from '../contexts/LoadingBarContext';
interface SidebarProps {
    isExpanded: boolean;
    onToggle: () => void;
    userName?: string | null;
    userEmail?: string | null;
    userImageUrl?: string | null;
}
interface SubMenuItem {
    id: string;
    label: string;
}
interface MenuItem {
    id: string;
    label: string;
    iconPath: string;
    route?: string;
    subItems?: SubMenuItem[];
}
const MENU_ITEM_ROUTES: Record<string, string> = {
    dashboard: '/dashboard',
    Repositories: '/repositories',
    management: '/management',
    Settings: '/settings',
    Onboarding: '/onboarding',
    'Hot Zones': '/hot-zones',
    'Task Compass': '/task-compass',
};
const MAIN_MENU_ITEMS: MenuItem[] = [
    {
        id: 'dashboard',
        label: 'Dashboard',
        iconPath: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z',
    },
    {
        id: 'Repositories',
        label: 'Repositories',
        iconPath: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10',
    },
    {
        id: 'management',
        label: 'Management',
        iconPath: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01'
    },
    {
        id: 'Onboarding',
        label: 'Onboarding',
        iconPath: 'M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z'
    },
    {
        id: 'Task Compass',
        label: 'Task Compass',
        iconPath: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7'
    },
    {
        id: 'Hot Zones',
        label: 'Hot Zones',
        iconPath: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z'
    },
];
const BUTTON_BASE_CLASSES = 'w-full text-left pl-4 py-3 text-sm rounded transition-colors duration-200 flex items-center gap-3.5 cursor-pointer';
const BUTTON_ACTIVE_CLASSES = 'text-white bg-[#2a2a2a]/50 font-bold';
const BUTTON_INACTIVE_CLASSES = 'text-white/60 hover:text-white hover:bg-[#2a2a2a]/50';
function Icon({ iconPath, className = 'w-5 h-5' }: {
    iconPath: string | string[];
    className?: string;
}) {
    const paths = Array.isArray(iconPath) ? iconPath : [iconPath];
    return (<svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      {paths.map((path, index) => (<path key={index} strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={path}/>))}
    </svg>);
}
function SubMenuItem({ item, activeItem, setActiveItem, onMinimizeSidebar, router, pathname }: {
    item: SubMenuItem;
    activeItem: string;
    setActiveItem: (id: string) => void;
    onMinimizeSidebar?: () => void;
    router?: AppRouterInstance;
    pathname?: string;
}) {
    const isActive = activeItem === item.id;
    const handleClick = () => {
        setActiveItem(item.id);
    };
    return (<li className="relative">
      
      <svg className="absolute left-[-21px] top-1/2 -translate-y-1/2 w-[22px] h-[12px] overflow-visible pointer-events-none">
        <path d="M 0 -6 L 0 0 Q 0 6 11 6" stroke="#424242" strokeWidth="1" fill="none" strokeLinecap="round"/>
      </svg>
      <button onClick={handleClick} className={`w-full text-left pl-4 py-2.5 text-sm rounded transition-colors duration-200 cursor-pointer ${isActive ? BUTTON_ACTIVE_CLASSES : BUTTON_INACTIVE_CLASSES}`}>
        {item.label}
      </button>
    </li>);
}
interface MenuItemComponentProps {
    item: MenuItem;
    isExpanded: boolean;
    onToggle: () => void;
    activeItem: string;
    setActiveItem: (id: string) => void;
    router: AppRouterInstance;
    pathname: string;
    isMinimized?: boolean;
    onExpandSidebar?: () => void;
    onMinimizeSidebar?: () => void;
}
function MenuItemComponent({ item, isExpanded, onToggle, activeItem, setActiveItem, router, pathname, isMinimized = false, onExpandSidebar, onMinimizeSidebar }: MenuItemComponentProps) {
    const { startLoading } = useLoadingBar();
    const hasSubItems = Boolean(item.subItems?.length);
    const isActive = activeItem === item.id || (hasSubItems && item.subItems?.some(sub => activeItem === sub.id));
    const handleMenuItemClick = useCallback(() => {
        setActiveItem(item.id);
        const match = pathname.match(/\/org-([^/]+)/);
        const orgShortId = match ? match[1] : null;
        const baseRoute = item.route || MENU_ITEM_ROUTES[item.id];
        if (baseRoute) {
            const route = orgShortId ? `/org-${orgShortId}${baseRoute}` : baseRoute;
            startLoading();
            router.push(route);
        }
    }, [item.id, item.route, setActiveItem, router, pathname, startLoading]);
    const handleParentClick = useCallback(() => {
        if (isMinimized && hasSubItems) {
            onExpandSidebar?.();
        }
        onToggle();
    }, [isMinimized, hasSubItems, onExpandSidebar, onToggle]);
    if (hasSubItems) {
        const parentIsActive = item.subItems!.some(sub => activeItem === sub.id);
        return (<div>
        <button onClick={handleParentClick} className={`${BUTTON_BASE_CLASSES} ${isMinimized ? '' : 'pr-4 justify-between'} ${parentIsActive ? 'text-white hover:bg-[#2a2a2a]/50' : BUTTON_INACTIVE_CLASSES}`}>
          <div className="flex items-center gap-3.5">
            <Icon iconPath={item.iconPath}/>
            <span className={`${parentIsActive ? 'font-bold' : ''} transition-all duration-300 ${isMinimized ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100 w-auto'}`}>{item.label}</span>
          </div>
          <span className={`transition-all duration-300 ${isMinimized ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100 w-auto'}`}>
            <Icon iconPath="M19 9l-7 7-7-7" className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}/>
          </span>
        </button>
        {isExpanded && !isMinimized && (<div className="relative mt-2">
            
            <div className="absolute left-[26px] top-0 bottom-0 w-[1.5px] bg-[#424242]"></div>
            <ul className="space-y-2 pl-12">
              {item.subItems!.map((subItem) => (<SubMenuItem key={subItem.id} item={subItem} activeItem={activeItem} setActiveItem={setActiveItem} onMinimizeSidebar={onMinimizeSidebar} router={router} pathname={pathname}/>))}
            </ul>
          </div>)}
      </div>);
    }
    return (<button onClick={handleMenuItemClick} className={`${BUTTON_BASE_CLASSES} ${isActive ? BUTTON_ACTIVE_CLASSES : BUTTON_INACTIVE_CLASSES}`}>
      <Icon iconPath={item.iconPath}/>
      <span className={`transition-all duration-300 ${isMinimized ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100 w-auto'}`}>{item.label}</span>
    </button>);
}
export default function Sidebar({ isExpanded, onToggle, userName: propUserName, userEmail: propUserEmail, userImageUrl, }: SidebarProps) {
    const router = useRouter();
    const pathname = usePathname();
    const { data: session } = useSession();
    const { startLoading } = useLoadingBar();
    const [activeItem, setActiveItem] = useState<string>('');
    const [isMinimized, setIsMinimized] = useState(false);
    const [wasAutoExpanded, setWasAutoExpanded] = useState(false);
    const [expandedStates, setExpandedStates] = useState<Record<string, boolean>>({});
    const getOrgShortIdFromPath = useCallback(() => {
        const match = pathname.match(/\/org-([^/]+)/);
        return match ? match[1] : null;
    }, [pathname]);
    const orgShortId = getOrgShortIdFromPath();
    const buildRoute = useCallback((route: string) => {
        if (orgShortId) {
            return `/org-${orgShortId}${route}`;
        }
        return route;
    }, [orgShortId]);
    useEffect(() => {
        if (pathname.includes('/settings')) {
            setActiveItem('Settings');
        }
        else if (pathname.includes('/repositories')) {
            setActiveItem('Repositories');
        }
        else if (pathname.includes('/management')) {
            setActiveItem('management');
        }
        else if (pathname.includes('/onboarding')) {
            setActiveItem('Onboarding');
        }
        else if (pathname.includes('/hot-zones')) {
            setActiveItem('Hot Zones');
        }
        else if (pathname.includes('/task-compass')) {
            setActiveItem('Task Compass');
        }
        else if (pathname.includes('/dashboard') || pathname === '/') {
            setActiveItem('dashboard');
        }
    }, [pathname]);
    const userName = propUserName ?? session?.user?.name;
    const userEmail = propUserEmail ?? session?.user?.email;
    const setExpandedState = useCallback((id: string, value: boolean) => {
        setExpandedStates(prev => ({ ...prev, [id]: value }));
    }, []);
    const handleLogout = useCallback(async () => {
        await signOut({ redirect: false });
        startLoading();
        router.push('/login');
        router.refresh();
    }, [router, startLoading]);
    const userInitials = useMemo(() => {
        if (!userName)
            return 'U';
        const parts = userName.trim().split(' ');
        if (parts.length >= 2) {
            return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
        }
        return userName[0]?.toUpperCase() || 'U';
    }, [userName]);
    const handleSettingsClick = useCallback(() => {
        setActiveItem('Settings');
        startLoading();
        router.push('/settings');
    }, [router, startLoading]);
    const handleExpandSidebar = useCallback(() => {
        if (isMinimized) {
            setIsMinimized(false);
            setWasAutoExpanded(true);
        }
    }, [isMinimized]);
    const handleMinimizeSidebar = useCallback(() => {
        setIsMinimized(true);
        setWasAutoExpanded(false);
    }, []);
    const handleMouseLeave = useCallback(() => {
        if (wasAutoExpanded) {
            setIsMinimized(true);
            setWasAutoExpanded(false);
        }
    }, [wasAutoExpanded]);
    return (<aside className={`h-full bg-[#121215] border-r border-[#262626] transition-all duration-300 ${isMinimized ? 'w-20' : 'w-80'}`} onMouseLeave={handleMouseLeave}>
      <div className="flex flex-col h-full">
        
        <div className={`flex items-center ${isMinimized ? 'justify-center' : 'justify-between'} p-4 ${isMinimized ? 'px-4' : 'pl-8 pr-4'}`}>
          {!isMinimized && (<img src="/Full-logo.png" alt="Logo" className="h-10 w-auto"/>)}
          <button type="button" onClick={() => setIsMinimized(!isMinimized)} className="p-1.5 hover:bg-white/10 rounded transition-colors duration-200 cursor-pointer" aria-label="Minimize sidebar">
            <svg className="w-5 h-5 text-white/70 hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isMinimized ? "M13 5l7 7-7 7M5 5l7 7-7 7" : "M11 19l-7-7 7-7m8 14l-7-7 7-7"}/>
            </svg>
          </button>
        </div>

        
        <div className="border-t border-[#262626]"></div>

        
        <div className={`${isMinimized ? 'px-2' : 'px-4'} pt-5`}>
          {isMinimized ? (<button type="button" className="w-full py-2 flex items-center justify-center bg-[#1a1a1a] border border-[#262626] rounded hover:bg-[#1a1a1a]/80 transition-colors duration-200 cursor-pointer" aria-label="Search">
              <svg className="w-4 h-4 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
            </button>) : (<div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
              <input type="text" placeholder="Search..." className="w-full pl-10 pr-3 py-2 bg-[#1a1a1a] border border-[#262626] rounded text-white text-sm placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all"/>
            </div>)}
        </div>

        
        <nav className={`flex-1 flex flex-col overflow-y-auto sidebar-scrollbar ${isMinimized ? 'px-2' : 'px-4'} py-2`}>
          
          <div className="pt-5 pb-5">
            {!isMinimized && <h3 className="text-xs text-white pl-4 mb-3 tracking-wide">MAIN</h3>}
            <ul className="space-y-2.5">
              {MAIN_MENU_ITEMS.map((item) => (<li key={item.id}>
                  <MenuItemComponent item={item} isExpanded={expandedStates[item.id] || false} onToggle={() => setExpandedState(item.id, !expandedStates[item.id])} activeItem={activeItem} setActiveItem={setActiveItem} router={router} pathname={pathname} isMinimized={isMinimized} onExpandSidebar={handleExpandSidebar} onMinimizeSidebar={handleMinimizeSidebar}/>
                </li>))}
            </ul>
          </div>

          
          

          
          <div className={`border-t border-[#262626] ${isMinimized ? '' : '-mx-4'}`}></div>
          <div className="pt-5 pb-6">
            {!isMinimized && <h3 className="text-xs text-white pl-4 mb-3 tracking-wide">CONFIGURATIONS</h3>}
            <ul className="space-y-2.5">
              <li>
                <button onClick={handleSettingsClick} className={`${BUTTON_BASE_CLASSES} ${activeItem === 'Settings' ? BUTTON_ACTIVE_CLASSES : BUTTON_INACTIVE_CLASSES}`}>
                  <Icon iconPath={[
            "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z",
            "M15 12a3 3 0 11-6 0 3 3 0 016 0z"
        ]}/>
                  <span className={`transition-all duration-300 ${isMinimized ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100 w-auto'}`}>Settings</span>
                </button>
              </li>
              <li>
                <button onClick={handleLogout} className={`${BUTTON_BASE_CLASSES} ${BUTTON_INACTIVE_CLASSES}`}>
                  <Icon iconPath="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
                  <span className={`transition-all duration-300 ${isMinimized ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100 w-auto'}`}>Logout</span>
                </button>
              </li>
            </ul>
          </div>
        </nav>

        
        <div className={`${isMinimized ? 'px-2' : 'px-4'} py-4`}>
          <div className={`flex items-center ${isMinimized ? 'justify-center' : 'gap-3'} p-3`}>
            
            <div className="flex-shrink-0">
              {userImageUrl ? (<img src={userImageUrl} alt="Profile" className="w-10 h-10 rounded object-cover shadow-sm"/>) : (<img src="/Pfp-placeholder.png" alt="Profile" className="w-10 h-10 rounded object-cover shadow-sm"/>)}
            </div>
            
            {!isMinimized && (<div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">
                  {userName || 'User'}
                </p>
              </div>)}
            
            {!isMinimized && (<button onClick={handleSettingsClick} className="flex-shrink-0 p-1.5 hover:bg-white/10 rounded-md transition-all duration-200 cursor-pointer group">
                <Icon iconPath="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" className="w-5 h-5 text-white/70 group-hover:text-white transition-colors duration-200"/>
              </button>)}
          </div>
        </div>
      </div>
    </aside>);
}
