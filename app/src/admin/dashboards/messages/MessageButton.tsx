import { MessageCircleMore } from "lucide-react";
import { useMemo } from "react";
import { Link as WaspRouterLink, routes } from "wasp/client/router";
import { getContactMessages, useQuery } from "wasp/client/operations";

const MessageButton = () => {
  const { data: unreadMessages } = useQuery(getContactMessages, {
    status: "unread",
  });

  const unreadCount = useMemo(
    () => unreadMessages?.length ?? 0,
    [unreadMessages?.length],
  );

  return (
    <li className="relative">
      <WaspRouterLink
        className="h-8.5 w-8.5 border-stroke bg-gray hover:text-primary dark:border-strokedark dark:bg-meta-4 relative flex items-center justify-center rounded-full border-[0.5px] dark:text-white"
        to={routes.AdminMessagesRoute.to}
      >
        {unreadCount > 0 && (
          <span className="z-1 bg-meta-1 absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-semibold text-white">
            <span className="-z-1 bg-meta-1 absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"></span>
            <span className="relative">{unreadCount}</span>
          </span>
        )}
        <MessageCircleMore className="size-5" />
      </WaspRouterLink>
    </li>
  );
};

export default MessageButton;
