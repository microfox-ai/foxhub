"use client";

import { useSecretForm } from "@/components/screens/mybots/providers/SecretFormProvider";
import { useSecret } from "@/components/screens/mybots/providers/SecretProvider";
import ConfigDetailsForm from "@/components/screens/mybots/tabs/ConfigDetails";
import RequiredKeysForm from "@/components/screens/mybots/tabs/RequiredKeysForm";
import { RequiredKeyInfo } from "@/components/screens/mybots/types";
import { KeyIcon, SettingsIcon, CheckCircle2, Loader2, CheckIcon, ArrowUpRight } from "lucide-react";
import { useEffect, useState } from "react";
import { Constructor, Package } from "../types";
import { FormControl, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { FormField } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface GeneralTabProps {
    packageInfo?: Package;
    packageName: string;
    selectedConstructor?: Constructor;
    onClose: (submitted?: boolean) => void;
}

export const KeyForms = ({
    packageInfo,
    packageName,
    selectedConstructor,
    onClose,
}: GeneralTabProps) => {
    const [currentStep, setCurrentStep] = useState(1);
    const { mode, botToEdit } = useSecret();
    const { form, setPackageInfo, setSelectedConstructor, isUpdating } = useSecretForm();

    const requiredKeys = selectedConstructor?.requiredKeys;

    useEffect(() => {
        if (packageInfo) {
            setPackageInfo(packageInfo);
        }
        if (selectedConstructor) {
            setSelectedConstructor(selectedConstructor);
        }
    }, [packageInfo, selectedConstructor, setPackageInfo, setSelectedConstructor]);


    const handleNext = (e?: React.MouseEvent) => {
        if (e) {
            e.preventDefault();
        }
        if (currentStep === 1) {
            const fieldsToValidate = ['botName' as const, ...(requiredKeys?.map(key => `keys.${key.key}` as const) || [])];
            console.log(fieldsToValidate);

            // First validate the form fields
            // form.trigger(fieldsToValidate).then(isValid => {
            //     if (isValid) {

            //     }
            // });
            // Then check if all required keys have values
            const formValues = form.getValues();
            const emptyKeys = requiredKeys?.filter(key => {
                const value = formValues.keys?.[key.key];
                return !value || value.trim() === '';
            });

            if (emptyKeys && emptyKeys.length > 0) {
                // Set error for each empty key
                emptyKeys.forEach(key => {
                    if (key.required === true || key.required === undefined) {
                        form.setError(`keys.${key.key}`, {
                            type: 'manual',
                            message: `${key.displayName} is required`
                        });
                    }
                });
            } else {
                setCurrentStep(2);
            }
        } else if (currentStep === 2) {
            setCurrentStep(3);
        }
    };

    const handleBack = () => {
        setCurrentStep(prev => prev - 1);
    };

    const handleSkip = () => {
        setCurrentStep((_step) => _step + 1);
    };

    return (
        <div className="space-y-6">
            {currentStep === 1 && (
                <div className="space-y-6">
                    <FormField
                        control={form.control}
                        name="botName"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>
                                    Bot Nick Name
                                </FormLabel>
                                <FormControl>
                                    <Input {...field} placeholder="Enter bot name" />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {requiredKeys && requiredKeys.length > 0 && (
                        <div className="border-t border-neutral-200 pt-6">
                            <RequiredKeysForm form={form} requiredKeys={requiredKeys as any[]} />
                        </div>
                    )}

                    <div className="flex justify-end gap-2 pt-6">
                        <Link
                            href={packageInfo?.documentation ?? ""}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:text-blue-600 text-xs flex gap-1 items-center -mt-2 mr-auto"
                        >
                            <span>View How to get API keys</span>
                            <ArrowUpRight className="h-4 w-4" />
                        </Link>
                        <Button variant="outline" onClick={handleBack}
                            className="bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 hover:text-white border border-blue-200 hover:border-blue-300">
                            Auto-Setup
                        </Button>
                        <Button type="button" onClick={(e) => handleNext(e)}>
                            Next
                        </Button>
                    </div>
                </div>
            )}

            {currentStep === 2 && (
                <div className="space-y-6">
                    <ConfigDetailsForm
                        packageName={packageName}
                        mode={mode}
                        botToEdit={botToEdit}
                        selectedConstructor={selectedConstructor}
                    />

                    <div className="flex justify-between">
                        <Button variant="outline" onClick={handleBack}>
                            Back
                        </Button>
                        <div className="space-x-2">
                            <Button variant="outline" onClick={handleSkip}>
                                Skip
                            </Button>
                            <Button type="button" onClick={(e) => handleNext(e)}>
                                Next
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {currentStep === 3 && (
                <div className="text-center">
                    <div className="flex flex-col items-center gap-4 py-12">
                        <div className="p-3 bg-green-100 rounded-full">
                            <CheckCircle2 className="w-8 h-8 text-green-600" />
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900">
                            You're all set!
                        </h3>
                        <p className="text-gray-500 max-w-md">
                            Your bot has been configured successfully.
                            <br />
                            You can now start using it.
                        </p>
                    </div>
                    <div className="flex items-center justify-end gap-3 ">
                        <Button variant="outline" className="mr-auto" onClick={handleBack}>
                            Back
                        </Button>
                        <Button
                            variant="outline"
                            onClick={(e) => {
                                e.preventDefault();
                                onClose(false);
                            }}
                            disabled={isUpdating}
                        >
                            Cancel
                        </Button>
                        {(form.formState.isDirty) && (
                            <Button
                                type="submit"
                                disabled={isUpdating}
                                variant="ghost"
                                className="bg-green-50 text-green-700 hover:bg-green-100 hover:text-green-800 border border-green-200 hover:border-green-300"
                            >
                                {isUpdating ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                        Updating...
                                    </>
                                ) : (
                                    <>
                                        <CheckIcon className="h-4 w-4 mr-2" />
                                        Save Changes
                                    </>
                                )}
                            </Button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}