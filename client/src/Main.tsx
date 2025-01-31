import React, { Suspense, useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import { AppProps } from "./context/DataContext";
import LoadingOverlay from "./components/LoadingOverlay.tsx";

// eslint-disable-next-line react-refresh/only-export-components
const App = React.lazy(async () => await import("./App.tsx"));

// eslint-disable-next-line react-refresh/only-export-components
const AppWrapper = () => {
    const [isLoading, setIsLoading] = useState(false);
    const location = useLocation();

    useEffect(() => {
        setIsLoading(true);

        // Use a microtask to set isLoading to false after the current render cycle
        queueMicrotask(() => {
            setIsLoading(false);
        });
    }, [location]);

    return (
        <>
            {isLoading && <LoadingOverlay/>}
            <Suspense fallback={<LoadingOverlay/>}>
                <Routes>
                    <Route path="/*" element={<App/>}/>
                </Routes>
            </Suspense>
        </>
    );
};

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
        <AppProps>
            <Router>
                <AppWrapper/>
            </Router>
        </AppProps>
    </React.StrictMode>
);