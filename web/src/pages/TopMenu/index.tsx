import { FC, ReactNode, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { useSecuricator } from "../../context/SecuricatorContext";
import leftIcon from "../../assets/left.svg";

interface Props {
  title?: string;
  subtitle?: ReactNode;
  hideBackButton?: boolean;
}

export const TopMenu: FC<Props> = ({ hideBackButton, subtitle, title }) => {
  const { connected } = useSecuricator();
  const navigate = useNavigate();

  return (
    <div className="top-menu">
      {!hideBackButton && (
        <button
          className="btn btn-invisible"
          onClick={() => navigate("/chats")}
        >
          <svg
            stroke="currentColor"
            fill="currentColor"
            strokeWidth="0"
            viewBox="0 0 320 512"
            height="200px"
            width="200px"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M9.4 233.4c-12.5 12.5-12.5 32.8 0 45.3l192 192c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L77.3 256 246.6 86.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0l-192 192z"></path>
          </svg>
        </button>
      )}
      <div className="contact-name">
        <h2>{title}</h2>
        {subtitle}
      </div>
      <div className="conn-status" id="conn-status">
        {connected ? (
          <div className="connected"></div>
        ) : (
          <div className="disconnected"></div>
        )}
      </div>
    </div>
  );
};
