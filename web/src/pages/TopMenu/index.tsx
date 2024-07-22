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
          <img src={leftIcon} alt="" />
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
