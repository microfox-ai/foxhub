"use client";

import { createContext, useContext, useState } from "react";
import { useBackgroundTasksHook } from "../../../hooks/use-background-tasks";
import { useClientProject } from "../providers/ClientProjectProvider";

type BackgroundTaskContextType = ReturnType<typeof useBackgroundTaskProvider>;

const BackgroundTaskContext = createContext<
    BackgroundTaskContextType | undefined
>(undefined);

const useBackgroundTaskProvider = () => {
    const { selectedRequest } = useClientProject();
    const { error, sseStatus, metadata, response, taskState, isCompleted } =
        useBackgroundTasksHook(selectedRequest?.id ? `/api/background-tasks/events/request/${selectedRequest.id}` : null);

    return {
        error,
        sseStatus,
        metadata,
        response,
        taskState,
        isCompleted,
    };
};

interface BackgroundTaskProviderProps {
    children: React.ReactNode;
}

export const BackgroundTaskProvider = ({
    children,
}: BackgroundTaskProviderProps) => {
    const hookResult = useBackgroundTaskProvider();

    return (
        <BackgroundTaskContext.Provider value={hookResult}>
            {children}
        </BackgroundTaskContext.Provider>
    );
};

export const useBackgroundTasks = () => {
    const context = useContext(BackgroundTaskContext);
    if (context === undefined) {
        throw new Error(
            "useBackgroundTaskContext must be used within a BackgroundTaskProvider"
        );
    }
    return context;
};
