/* 共通問題（GitHub経由で全端末に配信。アプリでは読み取り専用）
   直接編集してもよいが、追加・更新は tools/merge_shared.py を使うと検証とSWのバージョン更新まで行える */
const SHARED_QUESTIONS = [
  {"id": "q1a12b24b319c787", "section": "1.1", "type": "desc", "question": "OSI参照モデルの第3層（レイヤ3）の名称は？", "explanation": "第1層から順に、物理層・データリンク層・ネットワーク層・トランスポート層・セッション層・プレゼンテーション層・アプリケーション層。ルータはレイヤ3で動作する。", "createdAt": 1791725187865, "answer": "ネットワーク層"},
  {"id": "q1a12b24b319rgeg", "section": "1.3", "type": "choice", "question": "/26 のサブネットで、ホストに割り当て可能なアドレス数はいくつか。", "explanation": "ホスト部は 32−26＝6ビット。2^6＝64 から、ネットワークアドレスとブロードキャストアドレスの2つを引いて 62。", "createdAt": 1791725187865, "choices": ["30", "62", "64", "126"], "answer": 1},
  {"id": "q1a12b24b319ar26", "section": "1.4", "type": "ox", "question": "TCPはコネクションレス型のプロトコルである。", "explanation": "TCPはコネクション型（3ウェイハンドシェイクで接続を確立し、確認応答や再送で信頼性を確保）。コネクションレス型はUDP。", "createdAt": 1791725187865, "answer": false},
  {"id": "q1a12b24b319mat9", "section": "3.2", "type": "desc", "question": "スタティックルートのアドミニストレーティブディスタンス（AD）の既定値は？", "explanation": "直接接続は0、スタティックは1。ADが小さいほど優先される。", "createdAt": 1791725187865, "answer": "1"},
  {"id": "q1a12b24b319wu5n", "section": "4.1", "type": "desc", "question": "OSPFのアドミニストレーティブディスタンス（AD）の既定値は？", "explanation": "参考：EIGRP（内部）90、OSPF 110、RIP 120。", "createdAt": 1791725187865, "answer": "110"},
  {"id": "q1a12b24b3199xjz", "section": "4.2", "type": "desc", "question": "プロセスID 1 でOSPFを有効にするコマンドは？（グローバルコンフィギュレーションモード）", "explanation": "プロセスIDはルータ内でのみ意味を持つ値で、隣接ルータと一致させる必要はない。", "createdAt": 1791725187865, "answer": "router ospf 1"},
  {"id": "q1a12b24b319wk7t", "section": "5.1", "type": "ox", "question": "標準ACLでは、送信元IPアドレスだけを条件に指定できる。", "explanation": "標準ACL（番号1〜99、1300〜1999）は送信元IPアドレスのみ。宛先・プロトコル・ポート番号も条件にしたい場合は拡張ACL（100〜199、2000〜2699）を使う。", "createdAt": 1791725187865, "answer": true},
  {"id": "q1a12b24b3198bu1", "section": "6.2", "type": "desc", "question": "DHCPでクライアントにIPアドレスが割り当てられるまでにやり取りされる4つのメッセージを、順番に答えよ。", "explanation": "頭文字をとって「DORA」と覚える。DISCOVERとREQUESTはクライアントからブロードキャストで送信される。", "createdAt": 1791725187865, "answer": "DHCPDISCOVER → DHCPOFFER → DHCPREQUEST → DHCPACK"},
  {"id": "q1a12b24b319p2kq", "section": "7.2", "type": "choice", "question": "トランクリンクでフレームにVLANタグを付加するIEEE標準はどれか。", "explanation": "802.1D＝STP、802.1X＝ポートベース認証、802.3ad＝リンクアグリゲーション（LACP）。", "createdAt": 1791725187865, "choices": ["IEEE 802.1Q", "IEEE 802.1D", "IEEE 802.1X", "IEEE 802.3ad"], "answer": 0},
  {"id": "q1a12b24b319lol6", "section": "8.1", "type": "desc", "question": "STPでルートブリッジに選出されるのはどのスイッチか。", "explanation": "ブリッジIDはブリッジプライオリティ（既定値32768）＋MACアドレス。プライオリティが同じならMACアドレスが小さい方が選ばれる。", "createdAt": 1791725187865, "answer": "ブリッジIDが最も小さいスイッチ"},
  {"id": "q1a12b24b319pf0p", "section": "9.1", "type": "choice", "question": "EtherChannelを動的に構成するプロトコルのうち、IEEE標準のものはどれか。", "explanation": "LACPはIEEE 802.3ad（802.1AX）の標準。PAgPはCisco独自。", "createdAt": 1791725187865, "choices": ["PAgP", "LACP", "CDP", "VTP"], "answer": 1},
  {"id": "q1a12b24b319gcgw", "section": "10.1", "type": "ox", "question": "IPv6アドレスの長さは128ビットである。", "explanation": "IPv4は32ビット、IPv6は128ビット。16ビットずつ8つのフィールドに区切り、16進数で表記する。", "createdAt": 1791725187865, "answer": true}
];
