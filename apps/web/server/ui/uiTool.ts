import { UiComponentProps } from "./UiComponentProps";

export type MyUiTool = {
  input: {
    uiType: string;
    type: "ui";
    uiComponent: string;
    props?: UiComponentProps[keyof UiComponentProps];
  };
  output?: {
    type: "ui";
    uiComponent: string;
    props: UiComponentProps[keyof UiComponentProps];
  };
};
export const uiTool = {
  construct: <P extends keyof UiComponentProps>(
    root: string,
    component: string,
    props: UiComponentProps[P]
  ) => {
    return {
      toolName: "ui-" + props.uiType,
      input: {
        uiType: props.uiType,
        type: "ui",
        uiComponent: root + "." + component,
        props: props,
      },
      output: {
        type: "ui",
        uiComponent: root + "." + component,
        props: props,
      },
    };
  },
  constructButtonsList: (
    root: string,
    component: string,
    props: {
      header: string;
      shiftMinion?: string;
      isUISticky?: boolean;
    }
  ) => {
    return uiTool.construct<"buttons_list">(root, component, {
      uiType: "buttons_list",
      isUISticky: props.isUISticky ?? false,
      buttonHeaderText: props.header,
      buttons: [
        {
          type: "deny",
          text: "Not Yet",
        },
        {
          ...(props.shiftMinion
            ? {
                action: {
                  id: "shiftMinion",
                  props: props.shiftMinion,
                  actionText: "Sure!, let's proceed!",
                },
              }
            : {}),
          text: "Sure",
          type: "confirm",
        },
      ],
    });
  },
};
