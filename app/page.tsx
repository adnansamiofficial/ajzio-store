 "use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ShoppingBag, ArrowRight, ShieldCheck, Truck, Sparkles } from "lucide-react";

type Product = { id:string; name:string; description?:string; images?:string[]; suggestedPrice?:number; inStock?:boolean; variants?:{color?:string|null;size?:string|null;inStock?:boolean}[] };
type CartItem = { product:Product; quantity:number };
const money = (n:number) => `৳${Number(n || 0).toLocaleString("en-BD")}`;

export default function Home() {
  const [products,setProducts] = useState<Product[]>([]);
  const [cart,setCart] = useState<CartItem[]>([]);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState("");
  const [added,setAdded] = useState("");
  useEffect(() => {
    fetch("/api/products").then(async r => { const d=await r.json(); if(!r.ok) throw new Error(d.error || "Product loading failed"); setProducts(d.data || []); })
      .catch(e => setError(e.message)).finally(()=>setLoading(false));
    try { const saved=localStorage.getItem("ajzio-cart"); if(saved) setCart(JSON.parse(saved)); } catch {}
  },[]);
  useEffect(()=>{ localStorage.setItem("ajzio-cart",JSON.stringify(cart)); },[cart]);
  const count = useMemo(()=>cart.reduce((s,i)=>s+i.quantity,0),[cart]);
  function add(p:Product) {
    setCart(old => { const found=old.find(i=>i.product.id===p.id); return found ? old.map(i=>i.product.id===p.id?{...i,quantity:i.quantity+1}:i) : [...old,{product:p,quantity:1}]; });
    setAdded(p.name); setTimeout(()=>setAdded(""),1800);
  }
  return <main>
    <div className="announcement">Complimentary care · Thoughtful finds · AJZIO Store</div>
    <nav className="nav">
      <Link href="/" style={{color:"inherit",textDecoration:"none"}}><div className="brand">AJZIO<small>THE ART OF EVERYDAY</small></div></Link>
      <div className="navlinks"><a href="#collection">Collection</a><a href="#story">Our Philosophy</a><Link href="/track">Track Order</Link></div>
      <Link href="/cart" className="cartbtn" style={{textDecoration:"none",color:"inherit"}}><ShoppingBag size={14} style={{verticalAlign:"middle",marginRight:8}}/> BAG ({count})</Link>
    </nav>
    <section className="hero"><div><div className="eyebrow">A more considered way to shop</div><h1 className="serif">Quiet luxury.<br/>Everyday icons.</h1><p>Discover thoughtfully selected pieces that bring a little more beauty to the everyday. Made for your moments, chosen by you.</p><a href="#collection" className="goldbtn">Explore collection <ArrowRight size={14} style={{verticalAlign:"middle",marginLeft:8}}/></a></div></section>
    <section className="section" id="collection">
      <div className="sectionhead"><div className="eyebrow">The AJZIO edit</div><h2>Curated for you</h2><p>Pieces worth making room for.</p></div>
      {added && <div className="success">{added} added to your bag.</div>}
      {error && <div className="notice">{error} Add your Business Koro API key in Vercel settings to load live products. Preview products are not fabricated.</div>}
      {loading ? <p className="muted" style={{textAlign:"center"}}>Loading collection…</p> : products.length ? <div className="grid">{products.map(p=><article className="product" key={p.id}><div className="productimg">{p.images?.[0] ? <img src={p.images[0]} alt={p.name}/> : <div style={{height:"100%",display:"grid",placeItems:"center",color:"#a69b87"}}><Sparkles size={28}/></div>}</div><div className="productmeta"><h3>{p.name}</h3><div className="price">{money(p.suggestedPrice || 0)}</div><p className="muted">{p.description?.slice(0,90)}</p><button className="addbtn" onClick={()=>add(p)} disabled={!p.inStock}> {p.inStock ? "Add to bag" : "Sold out"} </button></div></article>)}</div> : !error ? <p className="muted" style={{textAlign:"center"}}>No products are available right now.</p> : null}
    </section>
    <section className="section story" id="story"><img src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1100&q=85" alt="Thoughtful everyday style"/><div><div className="eyebrow">The AJZIO philosophy</div><h2>Less, but better.</h2><p>We believe the best things are chosen with intention. AJZIO brings together a considered collection for people who value quality, simplicity and the details that make everyday life feel special.</p><a className="goldbtn" href="#collection">Discover the edit</a></div></section>
    <section className="section"><div className="benefits"><div className="benefit"><ShieldCheck size={23}/><h3>Thoughtful selection</h3><p>Every piece has a place in our edit.</p></div><div className="benefit"><Truck size={23}/><h3>Bangladesh-wide delivery</h3><p>Convenient delivery across the country.</p></div><div className="benefit"><Sparkles size={23}/><h3>Elevated essentials</h3><p>Little details. Lasting impressions.</p></div></div></section>
    <footer className="footer"><div><div className="brand">AJZIO</div><p>Curated pieces for a life well considered. Thank you for making AJZIO part of your everyday.</p></div><div><b>Explore</b><p><a href="#collection">Collection</a><br/><Link href="/track">Track your order</Link><br/><Link href="/cart">Shopping bag</Link></p></div><div><b>AJZIO STORE</b><p>Bangladesh<br/>Customer care: Add your contact details</p><small>© {new Date().getFullYear()} AJZIO Store. All rights reserved.</small></div></footer>
  </main>;
}