"use client";

import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Copy, SettingsIcon, KeyIcon } from "lucide-react";
import { UseFormReturn } from "react-hook-form";
import { BotFormValues } from "../types";
import ConfigDetailsForm from "./ConfigDetails";
import { Constructor, KeyVariableConfig, Package } from "../../Chat/message/types";
import { useState } from "react";
import { toast } from "sonner";
import { useSecret } from "../providers/SecretProvider";
import RequiredKeysForm from "./RequiredKeysForm";

interface GeneralTabProps {
    form: UseFormReturn<BotFormValues>;
    requiredKeys: KeyVariableConfig[];
    packageInfo?: Package;
    packageName: string;
    selectedConstructor?: Constructor;
}

const GeneralTab = ({
    form,
    requiredKeys,
    packageName,
    selectedConstructor,
    packageInfo,
}: GeneralTabProps) => {
    const { mode, botToEdit } = useSecret();

    const internalKeys = selectedConstructor?.internalKeys;

    return (
        <div className="space-y-6 pt-0">
            <div className="flex flex-row items-center gap-2 border border-neutral-200 p-4 rounded-md">
                <img src={packageInfo?.icon} alt={packageInfo?.name} className="w-6 h-6 object-contain" />
                <div className="flex flex-col items-start ml-2">
                    <p className="text-md text-neutral-900 flex items-center gap-2">
                        {packageInfo?.title}
                        <span className="text-xs bg-neutral-200 px-1 py-1 rounded-md">{packageInfo?.name}</span>
                    </p>
                    <p className="text-sm text-neutral-500">
                        {packageInfo?.description}
                    </p>
                </div>
            </div>

            <FormField
                control={form.control}
                name="botName"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>
                            {mode === "create" ? "Name your bot" : "Bot Nick Name"}
                        </FormLabel>
                        <FormControl>
                            <Input {...field} placeholder="Enter bot name" />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />

            {requiredKeys && requiredKeys.length > 0 && (
                <div className="border-t border-neutral-200 pt-10 mt-10">
                    <h3 className="text-xs flex items-center gap-2 font-medium text-neutral-500 uppercase tracking-widest">
                        <KeyIcon className="h-4 w-4 mr-2" />
                        Required Keys
                    </h3>
                </div>
            )}

            {botToEdit?.isHidden ? (
                <div className="border-t border-neutral-200 pt-10 mt-10">
                    <h3 className="text-xs flex items-center gap-2 font-medium text-neutral-500 uppercase tracking-widest">
                        <KeyIcon className="h-4 w-4 mr-2" />
                        The bot keys are hidden, as this is an internal bot.
                    </h3>
                </div>
            ) : (
                <RequiredKeysForm form={form} requiredKeys={requiredKeys} />
            )}

            {internalKeys && internalKeys.length > 0 && (
                <div className="border-t border-neutral-200 pt-10 mt-10">
                    <h3 className="text-xs flex items-center gap-2 font-medium text-neutral-500 uppercase tracking-widest">
                        <KeyIcon className="h-4 w-4 mr-2" />
                        Internal Keys
                    </h3>
                </div>
            )}

            {internalKeys && internalKeys.length > 0 && (
                <RequiredKeysForm form={form} requiredKeys={internalKeys} hideKeys={["CLIENT_SECRET", "CLIENT_ID"]} />
            )}

            {botToEdit?.defaultConfig && botToEdit?.defaultConfig?.length > 0 && (
                <div className="border-t border-neutral-200 pt-10 mt-10">
                    <h3 className="text-xs flex items-center gap-2 font-medium text-neutral-500 uppercase tracking-widest">
                        <SettingsIcon className="h-4 w-4 mr-2" />
                        Optional Configurations
                    </h3>
                </div>
            )}
            <ConfigDetailsForm
                packageName={packageName}
                mode={mode}
                botToEdit={botToEdit}
                selectedConstructor={selectedConstructor}
            />
        </div>
    );
};

export default GeneralTab; 