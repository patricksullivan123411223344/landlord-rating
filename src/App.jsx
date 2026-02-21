import './App.css';
import React from 'react'
import { heroui } from "@heroui/react";

const HeroSection = () => {
  return (
    <Card className="py-4">
      <CardBody className="heroCardBody">
        <div className="heroCardInterior">
          <h1 className="heroText">Find your landlord rating...</h1>
          <p className="heroInfo">Do a deep search on your landlords lease history</p>
        </div>
      </CardBody>
    </Card>
  )
}

export default App
