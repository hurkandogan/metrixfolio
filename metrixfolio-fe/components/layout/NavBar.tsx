'use client';

import { useTheme } from '@/context/ThemeProvider';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRef } from 'react';
import { signOut } from 'firebase/auth';
import { auth, db } from '@/utils/firebase';
import { useAuth } from '@/context/AuthProvider';
import { doc, updateDoc, setDoc } from 'firebase/firestore';
import { FiDatabase } from 'react-icons/fi';
// icons
import { FiMoon, FiSun, FiLogOut } from 'react-icons/fi';

export const NavBar = () => {
  const { theme, toggleTheme } = useTheme();
  const currentPathName = usePathname();
  const logoutModalRef = useRef<HTMLDialogElement>(null);

  const { user } = useAuth();

  const handleLogoutConfirm = async () => {
    logoutModalRef.current?.close();
    try {
      await signOut(auth);
      console.log('user is logged out');
    } catch (err) {
      console.error('logout error: ', err);
    }
  };

  const handleTestFirestoreWrite = async () => {
    // Güvenlik kuralımız 'user' gerektiriyor, o yüzden kontrol edelim
    if (!user) {
      alert('Error: No authenticated user found.');
      return;
    }

    console.log(`Firestore writing test data begins.. User ID: ${user.uid}`);

    try {
      const docRef = doc(db, 'user_settings', user.uid);

      const testData = {
        message: 'Test is successful!',
        lastUpdated: new Date(),
        userEmail: user.email,
      };

      await setDoc(docRef, testData);

      alert(
        '✅ Successful! Test data written to Firestore. Check the console for details.',
      );
      console.log('Firestore writing successful!', testData);
    } catch (error) {
      console.error('Firestore Writing ERROR:', error);
      alert(
        '❌ ERROR! Could not write to Firestore. Check the console (F12) for details. (Most likely a Security Rule Error)',
      );
    }
  };

  return (
    <>
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
                href={'/'}
                className={`${currentPathName === '/stock-hunter' ? 'menu-active' : ''}`}
              >
                Stock Hunter
              </Link>
            </li>
          </ul>
        </div>
        {/* End */}
        <div className="navbar-end">
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
            className="btn btn-ghost btn-circle"
            onClick={handleTestFirestoreWrite}
            title="Test Firestore Write"
          >
            <FiDatabase className="h-5 w-5" />
          </button>

          <button
            className="btn btn-primary ml-2"
            onClick={() => logoutModalRef.current?.showModal()}
          >
            <FiLogOut className="h-5 w-5" />
            Logout
          </button>
        </div>
      </div>

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
    </>
  );
};
