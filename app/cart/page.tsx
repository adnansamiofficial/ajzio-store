 "use client";
import { useEffect, useState } from "react";
import Link from "next/link";
type P={id:string;name:string;suggestedPrice?:number;images?:string[]};
type I={product:P;quantity:number};
const money=(n:number)=>`৳${n.toLocaleString("en-BD")}`;
export default function Cart(){
 const [items,setItems]=useState<I[]>([]);
 useEffect(()=>{try{setItems(JSON.parse(localStorage.getItem("ajzio-cart")||"[]"))}catch{}},[]);
 function update(next:I[]){setItems(next);localStorage.setItem("ajzio-cart",JSON.stringify(next))}
 const total=items.reduce((s,i)=>s+(i.product.suggestedPrice||0)*i.quantity,0);
 return <><div className="announcement">AJZIO STORE · YOUR SELECTION</div><nav className="nav"><Link href="/" style={{color:"inherit",textDecoration:"none"}}><div className="brand">AJZIO<small>THE ART OF EVERYDAY</small></div></Link><Link href="/" className="cartbtn">Continue shopping</Link></nav><main className="checkout"><div className="eyebrow">Your selection</div><h1 className="serif">Shopping bag</h1>{!items.length?<div className="empty"><p>Your bag is waiting for something special.</p><Link className="goldbtn" href="/">Explore collection</Link></div>:<><div>{items.map(i=><div className="cartrow" key={i.product.id}><span>{i.product.name}<br/><small>{money(i.product.suggestedPrice||0)}</small></span><span><input type="number" min="1" max="20" value={i.quantity} onChange={e=>update(items.map(x=>x.product.id===i.product.id?{...x,quantity:Math.max(1,Math.min(20,Number(e.target.value)||1))}:x))}/></span><b>{money((i.product.suggestedPrice||0)*i.quantity)}</b><button onClick={()=>update(items.filter(x=>x.product.id!==i.product.id))}>Remove</button></div>)}</div><div className="checkoutbox"><p>Subtotal <b>{money(total)}</b></p><p className="muted">Delivery charge will be confirmed at checkout.</p><p><strong>Total before delivery</strong><strong>{money(total)}</strong></p><Link href="/checkout"><button className="submit">Proceed to checkout</button></Link></div></>}</main></>;
}