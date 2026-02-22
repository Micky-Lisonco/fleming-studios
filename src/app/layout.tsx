
import type{Metadata}from"next";import"./globals.css";
export const metadata:Metadata={title:"Fleming Studios"};
export default function RootLayout({children}:{children:React.ReactNode}){
  return(<html lang="en"><body style={{background:"#000",overflow:"hidden"}}>{children}</body></html>);
}
