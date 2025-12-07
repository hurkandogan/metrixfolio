'use client';

import { useTheme } from '@/context/ThemeProvider';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRef } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '@/utils/firebase';
// icons
import { FiMoon, FiSun, FiLogOut, FiDatabase } from 'react-icons/fi';
import { useAuth } from '@/context/AuthProvider';
import { useCurrency } from '@/context/CurrencyContext';

export const NavBar = () => {
  const { theme, toggleTheme } = useTheme();
  const currentPathName = usePathname();
  const logoutModalRef = useRef<HTMLDialogElement>(null);
  const authInfo = useAuth();
  const { currency, setCurrency } = useCurrency();

  const handleLogoutConfirm = async () => {
    logoutModalRef.current?.close();
    try {
      await signOut(auth);
      console.log('user is logged out');
    } catch (err) {
      console.error('logout error: ', err);
    }
  };

  const handleSync = async () => {
    const user = authInfo.user;

    if (!user) {
      console.error('No user found for sync.');
      return;
    }
    const token = await user.getIdToken();

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/sync/all`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'text/plain',
          },
        },
      );

      if (res.ok) {
        const data = await res.json();
        alert('Success: ' + JSON.stringify(data));
      } else {
        const errorText = await res.text();
        alert('Error: ' + errorText);
      }
    } catch (error) {
      console.error(error);
      alert('Connection error!');
    }
  };

  return (
    <>
      <dialog
        ref={logoutModalRef}
        className="modal modal-bottom sm:modal-middle"
      >
        <div className="modal-box">
          <h3 className="text-error text-lg font-bold">Confirm Logout</h3>
          <p className="py-4">
            Are you sure you want to log out from MetrixFolio?
          </p>
          <div className="modal-action">
            <form method="dialog">
              <button className="btn btn-ghost mr-2">Cancel</button>
            </form>
            <button className="btn btn-error" onClick={handleLogoutConfirm}>
              Yes, Logout
            </button>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>Cancel</button>
        </form>
      </dialog>

      <div className="navbar bg-base-100 sticky top-0 z-50 shadow-sm">
        {/* Start */}
        <div className="navbar-start">
          <Link href="/" className="btn btn-ghost text-xl normal-case">
            MetrixFolio
          </Link>
        </div>

        {/* Center */}
        <div className="navbar-center hidden lg:flex">
          <ul className="menu menu-horizontal px-1">
            <li>
              <Link
                href={'/'}
                className={`${currentPathName === '/' ? 'menu-active' : ''}`}
              >
                Dashboard
              </Link>
            </li>
            <li>
              <Link
                href={'/positions'}
                className={`${currentPathName === '/positions' ? 'menu-active' : ''}`}
              >
                Positions
              </Link>
            </li>
            <li>
              <Link
                href={'/transactions'}
                className={`${currentPathName === '/transactions' ? 'menu-active' : ''}`}
              >
                Transactions
              </Link>
            </li>
            <li>
              <Link
                href={'/settings'}
                className={`${currentPathName === '/settings' ? 'menu-active' : ''}`}
              >
                Settings
              </Link>
            </li>
          </ul>
        </div>

        {/* End */}
        <div className="navbar-end">
          <select
            className="select select-ghost select-sm mr-2 w-25 font-bold"
            value={currency}
            onChange={(e) => setCurrency(e.target.value as any)}
          >
            <option value="USD">🇺🇸 USD</option>
            <option value="EUR">🇪🇺 EUR</option>
            <option value="TRY">🇹🇷 TRY</option>
            {/* <option value="GBP">🇬🇧 GBP</option> */}
          </select>

          <label className="swap swap-rotate btn btn-ghost btn-circle">
            <input
              type="checkbox"
              onChange={toggleTheme}
              checked={theme === 'dark'}
              className="hidden"
            />

            <FiSun className="swap-on h-6 w-6 fill-current" />

            <FiMoon className="swap-off h-6 w-6 fill-current" />
          </label>

          <button
            className="btn btn-primary ml-2"
            onClick={() => logoutModalRef.current?.showModal()}
          >
            <FiLogOut className="h-5 w-5" />
            Logout
          </button>
        </div>
      </div>
    </>
  );
};
