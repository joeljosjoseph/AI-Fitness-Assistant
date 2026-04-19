import "@/styles/globals.css";
import { useEffect } from "react";
import { useRouter } from "next/router";
import { Bounce, ToastContainer } from "react-toastify";

const PUBLIC_ROUTES = ["/", "/onboarding"];

export default function App({ Component, pageProps }) {
  const router = useRouter();

  useEffect(() => {
    const user = localStorage.getItem("user");
    if (!user && !PUBLIC_ROUTES.includes(router.pathname)) {
      router.push("/");
    }
  }, [router.pathname]);

  return (
    <>
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick={false}
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
        transition={Bounce}
      />
      <Component {...pageProps} />
    </>
  );
}