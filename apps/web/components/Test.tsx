"use client";

const Test = () => {
  const openWhatsappWidget = () => {
    const width = 500;
    const height = 600;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;

    window.open(
      "/widget/good-friend/whatsapp?clientSecretId=43f14bd4-0f37-406c-9273-670179d3f3f3&businessUserId=123&callbackUri=https://aidouse.com/api/agent/chat/whatsapp/register",
      "WhatsApp Widget",
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
    );
  };

  return (
    <div className="p-4">
      <button
        onClick={openWhatsappWidget}
        className="bg-green-500  overflow-y-auto text-white px-4 py-2 rounded hover:bg-green-600"
      >
        Talk to Good Friend
      </button>
    </div>
  );
};

export default Test;
